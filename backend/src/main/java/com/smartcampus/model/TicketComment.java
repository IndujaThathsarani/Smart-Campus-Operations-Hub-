package com.smartcampus.model;

import java.time.Instant;

/** Threaded note on an incident ticket (admin moderation / internal notes). */
public class TicketComment {

    private String id;

    /** e.g. ADMIN, USER — free text until auth module supplies real users. */
    private String author;

    private String body;

    private Instant createdAt;

    /** When true, hide from public/user views (admin still sees in moderation tab). */
    private boolean hidden;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isHidden() {
        return hidden;
    }

    public void setHidden(boolean hidden) {
        this.hidden = hidden;
    }
}
