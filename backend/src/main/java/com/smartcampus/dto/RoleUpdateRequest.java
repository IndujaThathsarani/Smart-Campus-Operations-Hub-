package com.smartcampus.dto;

import java.util.Set;

public class RoleUpdateRequest {

    private Set<String> roles;

    public RoleUpdateRequest() {
    }

    public Set<String> getRoles() {
        return roles;
    }

    public void setRoles(Set<String> roles) {
        this.roles = roles;
    }
}