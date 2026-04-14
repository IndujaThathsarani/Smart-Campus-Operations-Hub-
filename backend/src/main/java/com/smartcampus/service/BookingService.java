package com.smartcampus.service;

import com.smartcampus.booking.BookingStatus;
import com.smartcampus.dto.BookingDTO;
import com.smartcampus.model.Booking;
import com.smartcampus.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class BookingService {
    
    @Autowired
    private BookingRepository bookingRepository;
    
    public Booking createBooking(BookingDTO bookingDTO, String userId, String userName) {
        if (bookingDTO.getStartTime().isAfter(bookingDTO.getEndTime())) {
            throw new IllegalArgumentException("Start time must be before end time");
        }
        
        if (hasConflict(bookingDTO.getResourceId(), bookingDTO.getStartTime(), bookingDTO.getEndTime(), null)) {
            throw new IllegalStateException("Time slot conflicts with existing booking");
        }
        
        Booking booking = new Booking(
            bookingDTO.getResourceId(),
            userId,
            userName,
            bookingDTO.getStartTime(),
            bookingDTO.getEndTime(),
            bookingDTO.getPurpose(),
            bookingDTO.getExpectedAttendees()
        );
        
        return bookingRepository.save(booking);
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
        return bookingRepository.save(booking);
    }
    
    public Booking getBookingById(String bookingId) {
        return bookingRepository.findById(bookingId)
            .orElseThrow(() -> new RuntimeException("Booking not found"));
    }
    
    public List<Booking> getUserBookings(String userId) {
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