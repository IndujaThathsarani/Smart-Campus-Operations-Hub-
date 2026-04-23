package com.smartcampus.dto;

import com.smartcampus.model.Role;

import java.util.Set;

public class RoleUpdateRequest {

    private Set<Role> roles;

    public RoleUpdateRequest() {
    }

    public Set<Role> getRoles() {
        return roles;
    }

    public void setRoles(Set<Role> roles) {
        this.roles = roles;
    }
}