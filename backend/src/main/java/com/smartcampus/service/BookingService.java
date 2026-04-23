package com.smartcampus.service;

import com.smartcampus.booking.BookingStatus;
import com.smartcampus.dto.BookingDTO;
import com.smartcampus.model.Booking;
import com.smartcampus.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
public class BookingService {
    
    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private NotificationService notificationService;
    
    public Booking createBooking(BookingDTO bookingDTO, String userId, String userName) {
        if (bookingDTO.getStartTime().isAfter(bookingDTO.getEndTime())) {
            throw new IllegalArgumentException("Start time must be before end time");
        }

        validateFutureDate(bookingDTO.getStartTime());
        validateDuration(bookingDTO.getStartTime(), bookingDTO.getEndTime());
        
        boolean hasConflict = hasConflict(bookingDTO.getResourceId(), bookingDTO.getStartTime(), bookingDTO.getEndTime(), null);
        if (hasConflict && !bookingDTO.isWaitlistRequested()) {
            throw new IllegalStateException("Time slot conflicts with existing booking");
        }
        
        Booking booking = new Booking(
            bookingDTO.getResourceId(),
            bookingDTO.getLocation(),
            userId,
            userName,
            bookingDTO.getStartTime(),
            bookingDTO.getEndTime(),
            bookingDTO.getPurpose(),
            bookingDTO.getExpectedAttendees()
        );

        if (hasConflict && bookingDTO.isWaitlistRequested()) {
            booking.setStatus(BookingStatus.WAITLISTED);
            booking.setAdminReason("Added to waitlist because the requested slot is already booked");
        }
        
        Booking savedBooking = bookingRepository.save(booking);

        if (savedBooking.getStatus() == BookingStatus.WAITLISTED) {
            notificationService.createNotification(
                userId,
                "Added to waitlist",
                "Your booking request for resource " + savedBooking.getResourceId() + " has been added to the waitlist.",
                "WAITLISTED",
                savedBooking.getId()
            );
        }

        return savedBooking;
    }
    
    public boolean hasConflict(String resourceId, LocalDateTime startTime, LocalDateTime endTime, String excludeBookingId) {
        List<BookingStatus> activeStatuses = List.of(BookingStatus.PENDING, BookingStatus.APPROVED);
        List<Booking> conflictingBookings = bookingRepository.findConflictingBookings(
            resourceId, activeStatuses, startTime, endTime
        );
        
        if (excludeBookingId != null) {
            conflictingBookings.removeIf(b -> b.getId().equals(excludeBookingId));
        }
        
        return !conflictingBookings.isEmpty();
    }
    
    public boolean isValidTransition(BookingStatus current, BookingStatus next) {
        if (current == BookingStatus.PENDING && (next == BookingStatus.APPROVED || next == BookingStatus.REJECTED)) {
            return true;
        }
        if (current == BookingStatus.APPROVED && next == BookingStatus.CANCELLED) {
            return true;
        }
        return false;
    }
    
    public Booking approveBooking(String bookingId, String adminReason) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new RuntimeException("Booking not found"));
        
        if (!isValidTransition(booking.getStatus(), BookingStatus.APPROVED)) {
            throw new IllegalStateException("Cannot approve booking with status: " + booking.getStatus());
        }
        
        booking.setStatus(BookingStatus.APPROVED);
        booking.setAdminReason(adminReason);
        return bookingRepository.save(booking);
    }
    
    public Booking rejectBooking(String bookingId, String adminReason) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new RuntimeException("Booking not found"));
        
        if (!isValidTransition(booking.getStatus(), BookingStatus.REJECTED)) {
            throw new IllegalStateException("Cannot reject booking with status: " + booking.getStatus());
        }
        
        booking.setStatus(BookingStatus.REJECTED);
        booking.setAdminReason(adminReason);
        return bookingRepository.save(booking);
    }
    
    public Booking cancelBooking(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new RuntimeException("Booking not found"));
        
        if (!isValidTransition(booking.getStatus(), BookingStatus.CANCELLED)) {
            throw new IllegalStateException("Cannot cancel booking with status: " + booking.getStatus());
        }
        
        booking.setStatus(BookingStatus.CANCELLED);
        Booking cancelledBooking = bookingRepository.save(booking);
        promoteNextWaitlistedBooking(cancelledBooking);
        return cancelledBooking;
    }

    private void promoteNextWaitlistedBooking(Booking cancelledBooking) {
        List<Booking> waitlistedBookings = bookingRepository.findConflictingBookings(
            cancelledBooking.getResourceId(),
            List.of(BookingStatus.WAITLISTED),
            cancelledBooking.getStartTime(),
            cancelledBooking.getEndTime()
        );

        waitlistedBookings.stream()
            .sorted(Comparator.comparing(Booking::getCreatedAt))
            .findFirst()
            .ifPresent(nextBooking -> {
                nextBooking.setStatus(BookingStatus.APPROVED);
                nextBooking.setAdminReason(
                    "Auto-promoted from waitlist after cancellation of booking " + cancelledBooking.getId()
                );
                bookingRepository.save(nextBooking);

                notificationService.createNotification(
                    nextBooking.getUserId(),
                    "Waitlist promoted",
                    "Your waitlisted booking for resource " + nextBooking.getResourceId() +
                        " has been promoted to approved.",
                    "PROMOTED",
                    nextBooking.getId()
                );
            });
    }
    
    public Booking getBookingById(String bookingId) {
        return bookingRepository.findById(bookingId)
            .orElseThrow(() -> new RuntimeException("Booking not found"));
    }
    
    public List<Booking> getUserBookings(String userId) {
        System.out.println("Fetching bookings for user: " + userId);
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
    
    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }
    
    public List<Booking> getBookingsByStatus(BookingStatus status) {
        return bookingRepository.findByStatus(status);
    }
    
    public List<Booking> getBookingsByResource(String resourceId) {
        return bookingRepository.findByResourceIdOrderByStartTimeAsc(resourceId);
    }

    // Validate future dates only
public void validateFutureDate(LocalDateTime startTime) {
    if (startTime.isBefore(LocalDateTime.now())) {
        throw new IllegalArgumentException("Cannot book in the past");
    }
}

// Validate booking duration (max 4 hours)
public void validateDuration(LocalDateTime startTime, LocalDateTime endTime) {
    long hours = java.time.Duration.between(startTime, endTime).toHours();
    if (hours > 4) {
        throw new IllegalArgumentException("Booking cannot exceed 4 hours");
    }
    if (hours < 1) {
        throw new IllegalArgumentException("Booking must be at least 1 hour");
    }
}
}