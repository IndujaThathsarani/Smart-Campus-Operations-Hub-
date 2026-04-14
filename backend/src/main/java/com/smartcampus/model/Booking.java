package com.smartcampus.model;

import com.smartcampus.booking.BookingStatus;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "bookings")
@CompoundIndex(name = "conflict_check_idx", 
                def = "{'resourceId': 1, 'status': 1, 'startTime': 1, 'endTime': 1}")
public class Booking {
    
    @Id
    private String id;
    
    @Indexed
    private String resourceId;
    
    @Indexed
    private String userId;
    
    private String userName;
    
    private LocalDateTime startTime;
    
    private LocalDateTime endTime;
    
    private String purpose;
    
    private Integer expectedAttendees;
    
    private BookingStatus status;
    
    private String adminReason;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    // Default constructor
    public Booking() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.status = BookingStatus.PENDING;
    }
    
    // Parameterized constructor
    public Booking(String resourceId, String userId, String userName, 
                   LocalDateTime startTime, LocalDateTime endTime, 
                   String purpose, Integer expectedAttendees) {
        this();
        this.resourceId = resourceId;
        this.userId = userId;
        this.userName = userName;
        this.startTime = startTime;
        this.endTime = endTime;
        this.purpose = purpose;
        this.expectedAttendees = expectedAttendees;
    }
    
    // Getters
    public String getId() {
        return id;
    }
    
    public String getResourceId() {
        return resourceId;
    }
    
    public String getUserId() {
        return userId;
    }
    
    public String getUserName() {
        return userName;
    }
    
    public LocalDateTime getStartTime() {
        return startTime;
    }
    
    public LocalDateTime getEndTime() {
        return endTime;
    }
    
    public String getPurpose() {
        return purpose;
    }
    
    public Integer getExpectedAttendees() {
        return expectedAttendees;
    }
    
    public BookingStatus getStatus() {
        return status;
    }
    
    public String getAdminReason() {
        return adminReason;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    // Setters
    public void setId(String id) {
        this.id = id;
    }
    
    public void setResourceId(String resourceId) {
        this.resourceId = resourceId;
    }
    
    public void setUserId(String userId) {
        this.userId = userId;
    }
    
    public void setUserName(String userName) {
        this.userName = userName;
    }
    
    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }
    
    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }
    
    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }
    
    public void setExpectedAttendees(Integer expectedAttendees) {
        this.expectedAttendees = expectedAttendees;
    }
    
    public void setStatus(BookingStatus status) {
        this.status = status;
        this.updatedAt = LocalDateTime.now();
    }
    
    public void setAdminReason(String adminReason) {
        this.adminReason = adminReason;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}