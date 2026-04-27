package com.smartcampus.dto;

public class TechnicianOptionResponse {

    private String id;
    private String name;
    private String email;
    private String label;

    public TechnicianOptionResponse(String id, String name, String email, String label) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.label = label;
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

    public String getLabel() {
        return label;
    }
}
