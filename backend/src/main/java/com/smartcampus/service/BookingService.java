package com.smartcampus.service;

import com.smartcampus.booking.BookingStatus;
import com.smartcampus.dto.BookingDTO;
import com.smartcampus.model.Booking;
import com.smartcampus.model.Resource;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.ResourceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class BookingService {
    
    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ResourceRepository resourceRepository;
    
    public Booking createBooking(BookingDTO bookingDTO, String userId, String userName) {
        if (bookingDTO.getStartTime().isAfter(bookingDTO.getEndTime())) {
            throw new IllegalArgumentException("Start time must be before end time");
        }

        Resource resource = resolveResource(bookingDTO.getResourceId());
        // Persist canonical resource ID so bookings consistently map to one resource.
        bookingDTO.setResourceId(resource.getId());

        validateFutureDate(bookingDTO.getStartTime());
        validateDuration(bookingDTO.getStartTime(), bookingDTO.getEndTime());
        validateAgainstResourceAvailability(resource, bookingDTO.getStartTime(), bookingDTO.getEndTime());
        
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
        } else {
            notificationService.createNotification(
                userId,
                "Booking request received",
                "Your booking request for resource " + savedBooking.getResourceId() + " is pending review.",
                "BOOKING_REQUESTED",
                "BOOKING",
                savedBooking.getId(),
                userId,
                createBookingMetadata(savedBooking, null)
            );
        }

        return savedBooking;
    }

    private Resource resolveResource(String resourceIdentifier) {
        if (resourceIdentifier == null || resourceIdentifier.trim().isEmpty()) {
            throw new IllegalArgumentException("Resource ID is required");
        }

        String trimmed = resourceIdentifier.trim();

        Optional<Resource> byId = resourceRepository.findById(trimmed);
        if (byId.isPresent()) {
            return byId.get();
        }

        return resourceRepository.findByNameIgnoreCase(trimmed)
            .orElseThrow(() -> new IllegalArgumentException("Resource not found: " + resourceIdentifier));
    }

    private void validateAgainstResourceAvailability(Resource resource, LocalDateTime startTime, LocalDateTime endTime) {
        if (resource == null) {
            throw new IllegalArgumentException("Resource is required");
        }

        if (!"ACTIVE".equalsIgnoreCase(resource.getStatus())) {
            throw new IllegalArgumentException("Selected resource is not active");
        }

        if (resource.getAvailabilityStartDate() == null || resource.getAvailabilityEndDate() == null
            || resource.getAvailabilityStart() == null || resource.getAvailabilityEnd() == null) {
            throw new IllegalArgumentException("Resource availability schedule is incomplete");
        }

        try {
            LocalDate availableFrom = LocalDate.parse(resource.getAvailabilityStartDate());
            LocalDate availableTo = LocalDate.parse(resource.getAvailabilityEndDate());
            LocalTime availableStart = LocalTime.parse(resource.getAvailabilityStart());
            LocalTime availableEnd = LocalTime.parse(resource.getAvailabilityEnd());

            LocalDate bookingStartDate = startTime.toLocalDate();
            LocalDate bookingEndDate = endTime.toLocalDate();

            if (bookingStartDate.isBefore(availableFrom) || bookingEndDate.isAfter(availableTo)) {
                throw new IllegalArgumentException(
                    "Booking must be within resource date range " + availableFrom + " to " + availableTo
                );
            }

            if (!bookingStartDate.equals(bookingEndDate)) {
                throw new IllegalArgumentException("Booking must start and end on the same date");
            }

            LocalTime bookingStart = startTime.toLocalTime();
            LocalTime bookingEnd = endTime.toLocalTime();

            if (bookingStart.isBefore(availableStart) || bookingEnd.isAfter(availableEnd)) {
                throw new IllegalArgumentException(
                    "Booking must be within daily availability window " + availableStart + " - " + availableEnd
                );
            }
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Resource availability schedule is invalid");
        }
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
        Booking saved = bookingRepository.save(booking);
        notificationService.createNotification(
            saved.getUserId(),
            "Booking approved",
            "Your booking request for resource " + saved.getResourceId() + " has been approved.",
            "APPROVED",
            "BOOKING",
            saved.getId(),
            null,
            createBookingMetadata(saved, adminReason)
        );
        return saved;
    }
    
    public Booking rejectBooking(String bookingId, String adminReason) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new RuntimeException("Booking not found"));
        
        if (!isValidTransition(booking.getStatus(), BookingStatus.REJECTED)) {
            throw new IllegalStateException("Cannot reject booking with status: " + booking.getStatus());
        }
        
        booking.setStatus(BookingStatus.REJECTED);
        booking.setAdminReason(adminReason);
        Booking saved = bookingRepository.save(booking);
        notificationService.createNotification(
            saved.getUserId(),
            "Booking rejected",
            "Your booking request for resource " + saved.getResourceId() + " was rejected." + (adminReason == null ? "" : " Reason: " + adminReason),
            "REJECTED",
            "BOOKING",
            saved.getId(),
            null,
            createBookingMetadata(saved, adminReason)
        );
        return saved;
    }
    
    public Booking cancelBooking(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new RuntimeException("Booking not found"));
        
        if (!isValidTransition(booking.getStatus(), BookingStatus.CANCELLED)) {
            throw new IllegalStateException("Cannot cancel booking with status: " + booking.getStatus());
        }
        
        booking.setStatus(BookingStatus.CANCELLED);
        Booking cancelledBooking = bookingRepository.save(booking);
        notificationService.createNotification(
            cancelledBooking.getUserId(),
            "Booking cancelled",
            "Your booking for resource " + cancelledBooking.getResourceId() + " has been cancelled.",
            "CANCELLED",
            "BOOKING",
            cancelledBooking.getId(),
            cancelledBooking.getUserId(),
            createBookingMetadata(cancelledBooking, null)
        );
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

// Validate booking duration (minimum 1 hour)
public void validateDuration(LocalDateTime startTime, LocalDateTime endTime) {
    long hours = java.time.Duration.between(startTime, endTime).toHours();
    if (hours < 1) {
        throw new IllegalArgumentException("Booking must be at least 1 hour");
    }
}

    private java.util.Map<String, Object> createBookingMetadata(Booking booking, String reason) {
        java.util.Map<String, Object> metadata = new java.util.LinkedHashMap<>();
        metadata.put("resourceId", booking.getResourceId());
        if (booking.getLocation() != null) {
            metadata.put("location", booking.getLocation());
        }
        if (booking.getStatus() != null) {
            metadata.put("status", booking.getStatus().name());
        }
        if (reason != null && !reason.isBlank()) {
            metadata.put("reason", reason);
        }
        return metadata;
    }
}