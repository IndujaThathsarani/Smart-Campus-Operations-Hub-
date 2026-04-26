package com.smartcampus.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Document(collection = "notifications")
public class Notification {

    @Id
    private String id;
    private String userId;
    private String title;
    private String message;
    private String type;
    private boolean read;
    private String entityType;
    private String entityId;
    private String actorId;
    private Map<String, Object> metadata;
    private String bookingId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Notification() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.read = false;
        this.metadata = new LinkedHashMap<>();
    }

    public Notification(String userId, String title, String message, String type, String bookingId) {
        this();
        this.userId = userId;
        this.title = title;
        this.message = message;
        this.type = type;
        this.bookingId = bookingId;
    }

    public Notification(String userId, String title, String message, String type, String entityType, String entityId, String actorId, Map<String, Object> metadata) {
        this();
        this.userId = userId;
        this.title = title;
        this.message = message;
        this.type = type;
        this.entityType = entityType;
        this.entityId = entityId;
        this.actorId = actorId;
        this.metadata = metadata != null ? new LinkedHashMap<>(metadata) : new LinkedHashMap<>();
    }

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getTitle() {
        return title;
    }

    public String getMessage() {
        return message;
    }

    public String getType() {
        return type;
    }

    public boolean isRead() {
        return read;
    }

    public String getEntityType() {
        return entityType;
    }

    public String getEntityId() {
        return entityId;
    }

    public String getActorId() {
        return actorId;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public String getBookingId() {
        return bookingId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public void setEntityId(String entityId) {
        this.entityId = entityId;
    }

    public void setActorId(String actorId) {
        this.actorId = actorId;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata != null ? new LinkedHashMap<>(metadata) : new LinkedHashMap<>();
    }

    public void setRead(boolean read) {
        this.read = read;
        this.updatedAt = LocalDateTime.now();
    }

    public void setBookingId(String bookingId) {
        this.bookingId = bookingId;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
