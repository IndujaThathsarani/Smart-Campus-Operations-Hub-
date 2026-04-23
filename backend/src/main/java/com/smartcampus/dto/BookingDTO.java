package com.smartcampus.dto;

import java.time.LocalDateTime;

public class BookingDTO {
    private String resourceId;
    private String location;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String purpose;
    private Integer expectedAttendees;
    private boolean waitlistRequested;
    
    public BookingDTO() {}
    
    public BookingDTO(String resourceId, String location, LocalDateTime startTime, LocalDateTime endTime,
                      String purpose, Integer expectedAttendees) {
        this.resourceId = resourceId;
        this.location = location;
        this.startTime = startTime;
        this.endTime = endTime;
        this.purpose = purpose;
        this.expectedAttendees = expectedAttendees;
        this.waitlistRequested = false;
    }
    
    // Getters
    public String getResourceId() { return resourceId; }
    public String getLocation() { return location; }
    public LocalDateTime getStartTime() { return startTime; }
    public LocalDateTime getEndTime() { return endTime; }
    public String getPurpose() { return purpose; }
    public Integer getExpectedAttendees() { return expectedAttendees; }
    public boolean isWaitlistRequested() { return waitlistRequested; }
    
    // Setters
    public void setResourceId(String resourceId) { this.resourceId = resourceId; }
    public void setLocation(String location) { this.location = location; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }
    public void setPurpose(String purpose) { this.purpose = purpose; }
    public void setExpectedAttendees(Integer expectedAttendees) { this.expectedAttendees = expectedAttendees; }
    public void setWaitlistRequested(boolean waitlistRequested) { this.waitlistRequested = waitlistRequested; }
}