package com.smartcampus.dto;

import java.time.LocalDateTime;

public class BookingDTO {
    private String resourceId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String purpose;
    private Integer expectedAttendees;
    
    public BookingDTO() {}
    
    public BookingDTO(String resourceId, LocalDateTime startTime, LocalDateTime endTime, 
                      String purpose, Integer expectedAttendees) {
        this.resourceId = resourceId;
        this.startTime = startTime;
        this.endTime = endTime;
        this.purpose = purpose;
        this.expectedAttendees = expectedAttendees;
    }
    
    // Getters
    public String getResourceId() { return resourceId; }
    public LocalDateTime getStartTime() { return startTime; }
    public LocalDateTime getEndTime() { return endTime; }
    public String getPurpose() { return purpose; }
    public Integer getExpectedAttendees() { return expectedAttendees; }
    
    // Setters
    public void setResourceId(String resourceId) { this.resourceId = resourceId; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }
    public void setPurpose(String purpose) { this.purpose = purpose; }
    public void setExpectedAttendees(Integer expectedAttendees) { this.expectedAttendees = expectedAttendees; }
}