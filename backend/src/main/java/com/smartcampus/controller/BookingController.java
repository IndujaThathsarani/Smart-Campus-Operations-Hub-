package com.smartcampus.controller;

import com.smartcampus.booking.BookingStatus;
import com.smartcampus.dto.BookingDTO;
import com.smartcampus.model.Booking;
import com.smartcampus.service.BookingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"}, allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class BookingController {
    
    @Autowired
    private BookingService bookingService;
    
    private String getCurrentUserId() {
        return "temp-user-123";
    }
    
    private String getCurrentUserName() {
        return "Temp User";
    }

    @GetMapping("/hello")
    public String hello() {
        return "hello";
    }
    
    // Handle OPTIONS preflight requests
    @RequestMapping(method = RequestMethod.OPTIONS)
    public ResponseEntity<?> handleOptions() {
        return ResponseEntity.ok().build();
    }
    
    // GET all bookings
    @GetMapping
    public ResponseEntity<List<Booking>> getAllBookings(
            @RequestParam(required = false) BookingStatus status) {
        if (status != null) {
            return ResponseEntity.ok(bookingService.getBookingsByStatus(status));
        }
        return ResponseEntity.ok(bookingService.getAllBookings());
    }
    
    // GET user's own bookings
    @GetMapping("/me")
    public ResponseEntity<List<Booking>> getMyBookings() {
        String userId = getCurrentUserId();
        List<Booking> bookings = bookingService.getUserBookings(userId);
        return ResponseEntity.ok(bookings);
    }
    
    // GET booking by ID
    @GetMapping("/{id}")
    public ResponseEntity<Booking> getBookingById(@PathVariable String id) {
        Booking booking = bookingService.getBookingById(id);
        return ResponseEntity.ok(booking);
    }
    
    // POST create booking
    @PostMapping
    public ResponseEntity<?> createBooking(@RequestBody BookingDTO bookingDTO) {
        try {
            String userId = getCurrentUserId();
            String userName = getCurrentUserName();
            Booking booking = bookingService.createBooking(bookingDTO, userId, userName);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", booking.getStatus() == BookingStatus.WAITLISTED
                ? "Booking added to waitlist"
                : "Booking created successfully");
            response.put("bookingId", booking.getId());
            response.put("status", booking.getStatus());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "INVALID_INPUT");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (IllegalStateException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "CONFLICT");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
        }
    }
    
    // PUT approve booking
    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approveBooking(
            @PathVariable String id,
            @RequestBody Map<String, String> request) {
        try {
            String reason = request.getOrDefault("reason", "Approved by admin");
            Booking booking = bookingService.approveBooking(id, reason);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Booking approved successfully");
            response.put("bookingId", booking.getId());
            response.put("status", booking.getStatus());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "ERROR");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }
    
    // PUT reject booking
    @PutMapping("/{id}/reject")
    public ResponseEntity<?> rejectBooking(
            @PathVariable String id,
            @RequestBody Map<String, String> request) {
        try {
            String reason = request.getOrDefault("reason", "Rejected by admin");
            Booking booking = bookingService.rejectBooking(id, reason);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Booking rejected successfully");
            response.put("bookingId", booking.getId());
            response.put("status", booking.getStatus());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "ERROR");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }
    
    // PUT cancel booking
    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelBooking(@PathVariable String id) {
        try {
            Booking booking = bookingService.cancelBooking(id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Booking cancelled successfully");
            response.put("bookingId", booking.getId());
            response.put("status", booking.getStatus());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "ERROR");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }
    
    // GET check conflict
    @GetMapping("/check-conflict")
    public ResponseEntity<Map<String, Boolean>> checkConflict(
            @RequestParam String resourceId,
            @RequestParam String startTime,
            @RequestParam String endTime) {
        try {
            DateTimeFormatter formatter = DateTimeFormatter.ISO_DATE_TIME;
            LocalDateTime start = LocalDateTime.parse(startTime, formatter);
            LocalDateTime end = LocalDateTime.parse(endTime, formatter);
            
            boolean hasConflict = bookingService.hasConflict(resourceId, start, end, null);
            
            Map<String, Boolean> response = new HashMap<>();
            response.put("hasConflict", hasConflict);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Boolean> response = new HashMap<>();
            response.put("hasConflict", false);
            return ResponseEntity.ok(response);
        }
    }
    
    // GET filter bookings
    @GetMapping("/filter")
    public ResponseEntity<List<Booking>> filterBookings(
            @RequestParam(required = false) String resourceId,
            @RequestParam(required = false) BookingStatus status) {
        
        List<Booking> bookings = bookingService.getAllBookings();
        
        if (resourceId != null) {
            bookings = bookings.stream()
                    .filter(b -> b.getResourceId().equals(resourceId))
                    .collect(Collectors.toList());
        }
        if (status != null) {
            bookings = bookings.stream()
                    .filter(b -> b.getStatus() == status)
                    .collect(Collectors.toList());
        }
        
        return ResponseEntity.ok(bookings);
    }
    
    // GET booking statistics
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getBookingStatistics() {
        List<Booking> allBookings = bookingService.getAllBookings();
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("total", allBookings.size());
        stats.put("pending", allBookings.stream().filter(b -> b.getStatus() == BookingStatus.PENDING).count());
        stats.put("approved", allBookings.stream().filter(b -> b.getStatus() == BookingStatus.APPROVED).count());
        stats.put("rejected", allBookings.stream().filter(b -> b.getStatus() == BookingStatus.REJECTED).count());
        stats.put("cancelled", allBookings.stream().filter(b -> b.getStatus() == BookingStatus.CANCELLED).count());
        
        return ResponseEntity.ok(stats);
    }
}