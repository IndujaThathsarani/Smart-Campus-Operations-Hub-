package com.smartcampus.dto;

import com.smartcampus.model.Role;

public class ChangeRoleRequest {
    private String targetEmail;
    private Role newRole;

    public ChangeRoleRequest() {
    }

    public ChangeRoleRequest(String targetEmail, Role newRole) {
        this.targetEmail = targetEmail;
        this.newRole = newRole;
    }

    public String getTargetEmail() {
        return targetEmail;
    }

    public void setTargetEmail(String targetEmail) {
        this.targetEmail = targetEmail;
    }

    public Role getNewRole() {
        return newRole;
    }

    public void setNewRole(Role newRole) {
        this.newRole = newRole;
    }
}
