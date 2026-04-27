package com.smartcampus.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "incident_tickets")
public class IncidentTicket {

    // Category groups the type of maintenance or incident request.
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

    /** Human-friendly ticket number shown in UI (e.g. INC-2026-0001). */
    private String ticketNumber;

    // Optional link to a campus resource when the issue belongs to a specific item/room asset.
    private String resourceId;

    // Short summary shown on the ticket cards.
    private String subject;

    // Physical place where the incident happened.
    private String location;

    private String createdByUserId;

    private String createdByUserName;

    private Category category;

    // Main problem description entered by the reporter.
    private String description;

    private Priority priority;

    // Preferred ways for staff to contact the person who raised the ticket.
    private String contactEmail;

    private String contactPhone;

    // Current workflow stage of the ticket.
    private Status status;

    // Only used when the ticket is rejected by admin/staff.
    private String rejectReason;

    /** Name or identifier of assigned technician/staff (free text until Module E links users). */
    private String assignedTo;

    // SLA-related timestamps used for first response and resolution tracking.
    private Instant createdAt;
    private Instant firstResponseAt;
    private Instant resolvedAt;

    /** Stored filenames under upload dir (not full paths in JSON). */
    private List<String> attachmentFileNames = new ArrayList<>();

    // Embedded comment thread stored inside the same ticket document in MongoDB.
    private List<TicketComment> comments = new ArrayList<>();

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTicketNumber() {
        return ticketNumber;
    }

    public void setTicketNumber(String ticketNumber) {
        this.ticketNumber = ticketNumber;
    }

    public String getResourceId() {
        return resourceId;
    }

    public void setResourceId(String resourceId) {
        this.resourceId = resourceId;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(String createdByUserId) {
        this.createdByUserId = createdByUserId;
    }

    public String getCreatedByUserName() {
        return createdByUserName;
    }

    public void setCreatedByUserName(String createdByUserName) {
        this.createdByUserName = createdByUserName;
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

    public Instant getFirstResponseAt() {
        return firstResponseAt;
    }

    public void setFirstResponseAt(Instant firstResponseAt) {
        this.firstResponseAt = firstResponseAt;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(Instant resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public List<String> getAttachmentFileNames() {
        return attachmentFileNames;
    }

    public void setAttachmentFileNames(List<String> attachmentFileNames) {
        this.attachmentFileNames = attachmentFileNames;
    }

    public List<TicketComment> getComments() {
        return comments;
    }

    public void setComments(List<TicketComment> comments) {
        this.comments = comments;
    }
}
