package com.smartcampus.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "resources")
public class Resource {
    @Id
    private String id;
    private String name;
    private ResourceType type;
    private Integer capacity;
    private String location;
    private ResourceStatus status;
    private String description;
    private LocalDateTime availabilityStart;
    private LocalDateTime availabilityEnd;
    
    public Resource() {}
    
    // Getters
    public String getId() { return id; }
    public String getName() { return name; }
    public ResourceType getType() { return type; }
    public Integer getCapacity() { return capacity; }
    public String getLocation() { return location; }
    public ResourceStatus getStatus() { return status; }
    public String getDescription() { return description; }
    public LocalDateTime getAvailabilityStart() { return availabilityStart; }
    public LocalDateTime getAvailabilityEnd() { return availabilityEnd; }
    
    // Setters
    public void setId(String id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setType(ResourceType type) { this.type = type; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public void setLocation(String location) { this.location = location; }
    public void setStatus(ResourceStatus status) { this.status = status; }
    public void setDescription(String description) { this.description = description; }
    public void setAvailabilityStart(LocalDateTime availabilityStart) { this.availabilityStart = availabilityStart; }
    public void setAvailabilityEnd(LocalDateTime availabilityEnd) { this.availabilityEnd = availabilityEnd; }
}