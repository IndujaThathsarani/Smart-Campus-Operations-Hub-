package com.smartcampus.repository;

import com.smartcampus.booking.BookingStatus;
import com.smartcampus.model.Booking;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepository extends MongoRepository<Booking, String> {
    
    @Query("{ 'resourceId': ?0, " +
           "'status': { $in: ?1 }, " +
           "'startTime': { $lt: ?3 }, " +
           "'endTime': { $gt: ?2 } }")
    List<Booking> findConflictingBookings(
        String resourceId,
        List<BookingStatus> statuses,
        LocalDateTime startTime,
        LocalDateTime endTime
    );
    
    List<Booking> findByUserIdOrderByCreatedAtDesc(String userId);
    
    List<Booking> findByStatus(BookingStatus status);
    
    List<Booking> findByResourceIdOrderByStartTimeAsc(String resourceId);
}