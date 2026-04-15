package com.smartcampus.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "resources")
public class Resource {

    @Id
    private String id;
    private String name;
    private ResourceType type;
    private Integer capacity;
    private String location;
    private String availabilityStart;
    private String availabilityEnd;
    private String status;
    private String description;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public ResourceType getType() {
        return type;
    }

    public void setType(ResourceType type) {
        this.type = type;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getAvailabilityStart() {
        return availabilityStart;
    }

    public void setAvailabilityStart(String availabilityStart) {
        this.availabilityStart = availabilityStart;
    }

    public String getAvailabilityEnd() {
        return availabilityEnd;
    }

    public void setAvailabilityEnd(String availabilityEnd) {
        this.availabilityEnd = availabilityEnd;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
