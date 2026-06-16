package com.smartcampus.dto;

import com.smartcampus.model.Role;

import java.util.Set;

public class AuthUserResponse {

    private boolean authenticated;
    private String id;
    private String name;
    private String email;
    private String profilePicture;
    private Set<Role> roles;
    private boolean active;

    public AuthUserResponse() {
    }

    public AuthUserResponse(boolean authenticated) {
        this.authenticated = authenticated;
    }

    public AuthUserResponse(
            boolean authenticated,
            String id,
            String name,
            String email,
            String profilePicture,
            Set<Role> roles,
            boolean active
    ) {
        this.authenticated = authenticated;
        this.id = id;
        this.name = name;
        this.email = email;
        this.profilePicture = profilePicture;
        this.roles = roles;
        this.active = active;
    }

    public boolean isAuthenticated() {
        return authenticated;
    }

    public void setAuthenticated(boolean authenticated) {
        this.authenticated = authenticated;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getProfilePicture() {
        return profilePicture;
    }

    public Set<Role> getRoles() {
        return roles;
    }

    public boolean isActive() {
        return active;
    }
}