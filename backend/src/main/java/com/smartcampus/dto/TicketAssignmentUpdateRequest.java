package com.smartcampus.dto;

public class TicketAssignmentUpdateRequest {

    /** Empty or omitted clears assignment. */
    private String assignedTo;

    public String getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(String assignedTo) {
        this.assignedTo = assignedTo;
    }
}
