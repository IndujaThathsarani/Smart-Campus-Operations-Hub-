package com.smartcampus.dto;

public class UserStatusUpdateRequest {

    private boolean active;

    public UserStatusUpdateRequest() {
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}