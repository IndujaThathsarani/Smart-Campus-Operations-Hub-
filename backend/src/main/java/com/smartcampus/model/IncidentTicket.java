package com.smartcampus.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "incident_tickets")
public class IncidentTicket {

    public enum Category {
        ELECTRICAL,
        PLUMBING,
        HVAC,
        EQUIPMENT,
        IT_SOFTWARE,
        STRUCTURAL,
        SAFETY,
        CLEANING,
        GENERAL
    }

    public enum Priority {
        LOW,
        MEDIUM,
        HIGH,
        URGENT
    }

    public enum Status {
        OPEN,
        IN_PROGRESS,
        RESOLVED,
        CLOSED,
        REJECTED
    }

    @Id
    private String id;

    private String resourceId;

    private String location;

    private Category category;

    private String description;

    private Priority priority;

    private String contactEmail;

    private String contactPhone;

    private Status status;

    private String rejectReason;

    /** Name or identifier of assigned technician/staff (free text until Module E links users). */
    private String assignedTo;

    private Instant createdAt;

    /** Stored filenames under upload dir (not full paths in JSON). */
    private List<String> attachmentFileNames = new ArrayList<>();

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getResourceId() {
        return resourceId;
    }

    public void setResourceId(String resourceId) {
        this.resourceId = resourceId;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Priority getPriority() {
        return priority;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public void setContactPhone(String contactPhone) {
        this.contactPhone = contactPhone;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public String getRejectReason() {
        return rejectReason;
    }

    public void setRejectReason(String rejectReason) {
        this.rejectReason = rejectReason;
    }

    public String getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(String assignedTo) {
        this.assignedTo = assignedTo;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public List<String> getAttachmentFileNames() {
        return attachmentFileNames;
    }

    public void setAttachmentFileNames(List<String> attachmentFileNames) {
        this.attachmentFileNames = attachmentFileNames;
    }
}
