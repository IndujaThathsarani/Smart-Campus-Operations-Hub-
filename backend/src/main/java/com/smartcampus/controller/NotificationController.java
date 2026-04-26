package com.smartcampus.controller;

import com.smartcampus.model.Notification;
import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
import com.smartcampus.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
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

    @Autowired
    private UserRepository userRepository;

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String getCurrentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        String email = null;
        Object principal = authentication.getPrincipal();
        if (principal instanceof OAuth2User oAuth2User) {
            email = blankToNull(oAuth2User.getAttribute("email"));
        }
        if (email == null) {
            email = blankToNull(authentication.getName());
        }
        if (email == null) {
            return null;
        }

        User user = userRepository.findByEmail(email).orElse(null);
        return user != null ? user.getId() : null;
    }

    @GetMapping("/me")
    public ResponseEntity<List<Notification>> getMyNotifications(Authentication authentication) {
        String userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(notificationService.getUserNotifications(userId));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable String id, Authentication authentication) {
        try {
            String userId = getCurrentUserId(authentication);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            Notification notification = notificationService.markAsRead(id, userId);
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
