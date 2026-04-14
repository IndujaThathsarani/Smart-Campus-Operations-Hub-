package com.smartcampus.service;

import com.smartcampus.booking.BookingStatus;
import com.smartcampus.model.Booking;
import com.smartcampus.repository.BookingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @InjectMocks
    private BookingService bookingService;

    @Test
    void testValidStatusTransition() {
        assertTrue(bookingService.isValidTransition(BookingStatus.PENDING, BookingStatus.APPROVED));
        assertTrue(bookingService.isValidTransition(BookingStatus.PENDING, BookingStatus.REJECTED));
        assertTrue(bookingService.isValidTransition(BookingStatus.APPROVED, BookingStatus.CANCELLED));
        
        assertFalse(bookingService.isValidTransition(BookingStatus.REJECTED, BookingStatus.APPROVED));
        assertFalse(bookingService.isValidTransition(BookingStatus.CANCELLED, BookingStatus.APPROVED));
    }

    @Test
    void testGetBookingByIdNotFound() {
        String bookingId = "non-existent-id";
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.empty());
        
        assertThrows(RuntimeException.class, () -> {
            bookingService.getBookingById(bookingId);
        });
    }

    @Test
    void testBookingServiceExists() {
        assertNotNull(bookingService);
    }
}