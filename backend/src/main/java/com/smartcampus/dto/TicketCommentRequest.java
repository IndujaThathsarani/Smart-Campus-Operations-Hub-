package com.smartcampus.dto;

public class TicketCommentRequest {

    private String body;

    /** Optional; defaults to ADMIN. */
    private String author;

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }
}
