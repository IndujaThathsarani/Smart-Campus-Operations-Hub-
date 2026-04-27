package com.smartcampus.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ResourceType {
    LECTURE_HALL,
    LABORATORY,
    MEETING_ROOM,
    CLASSROOM,
    LAB,
    AUDITORIUM,
    SEMINAR_ROOM,
    EQUIPMENT,
    TRAINING_ROOM,
    WORKSHOP_AREA,
    STUDIO,
    LIBRARY_SPACE,
    OTHER;

    @JsonCreator
    public static ResourceType fromValue(String value) {
        if (value == null || value.isBlank()) {
            return OTHER;
        }

        String normalized = value.trim().toUpperCase().replace('-', '_').replace(' ', '_');

        return switch (normalized) {
            case "CLASSROOM" -> LECTURE_HALL;
            case "LAB" -> LABORATORY;
            case "LECTUREHALL" -> LECTURE_HALL;
            case "MEETINGROOM" -> MEETING_ROOM;
            case "SEMINARROOM" -> SEMINAR_ROOM;
            case "TRAININGROOM" -> TRAINING_ROOM;
            case "WORKSHOPAREA" -> WORKSHOP_AREA;
            case "LIBRARYSPACE" -> LIBRARY_SPACE;
            default -> {
                try {
                    yield ResourceType.valueOf(normalized);
                } catch (IllegalArgumentException ex) {
                    yield OTHER;
                }
            }
        };
    }

    @JsonValue
    public String toValue() {
        return name();
    }
}
