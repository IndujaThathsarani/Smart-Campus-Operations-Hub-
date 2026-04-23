package com.smartcampus.controller;

import com.smartcampus.model.Notification;
import com.smartcampus.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"}, allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    private String getCurrentUserId() {
        return "temp-user-123";
    }

    @GetMapping("/me")
    public ResponseEntity<List<Notification>> getMyNotifications() {
        return ResponseEntity.ok(notificationService.getUserNotifications(getCurrentUserId()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable String id) {
        try {
            Notification notification = notificationService.markAsRead(id, getCurrentUserId());
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Notification marked as read");
            response.put("notificationId", notification.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "ERROR");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }
}
