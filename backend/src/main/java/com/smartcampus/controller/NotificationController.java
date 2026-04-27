package com.smartcampus.controller;

import com.smartcampus.dto.CustomNotificationRequest;
import com.smartcampus.model.Notification;
import com.smartcampus.model.Role;
import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
import com.smartcampus.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.Set;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"}, allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    @Qualifier("customNotificationScheduler")
    private TaskScheduler customNotificationScheduler;

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

    @PostMapping("/custom")
    public ResponseEntity<?> sendCustomNotification(
            @RequestBody CustomNotificationRequest request,
            Authentication authentication
    ) {
        if (!isSystemAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "FORBIDDEN",
                    "message", "Only system admins can send custom notifications"
            ));
        }

        if (request == null || request.getRoles() == null || request.getRoles().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "INVALID_INPUT",
                    "message", "At least one target role is required"
            ));
        }

        String title = blankToNull(request.getTitle());
        String message = blankToNull(request.getMessage());
        if (title == null || message == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "INVALID_INPUT",
                    "message", "Title and message are required"
            ));
        }

        String scheduleMode = blankToNull(request.getScheduleMode());
        if (scheduleMode == null) {
            scheduleMode = "NOW";
        }

        boolean scheduled = "SCHEDULED".equalsIgnoreCase(scheduleMode);
        Instant scheduledInstant = null;
        if (scheduled) {
            String scheduledAtRaw = blankToNull(request.getScheduledAt());
            if (scheduledAtRaw == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "error", "INVALID_INPUT",
                        "message", "scheduledAt is required when scheduleMode is SCHEDULED"
                ));
            }

            try {
                LocalDateTime scheduledAt = LocalDateTime.parse(scheduledAtRaw);
                scheduledInstant = scheduledAt.atZone(ZoneId.systemDefault()).toInstant();
            } catch (Exception ex) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "error", "INVALID_INPUT",
                        "message", "Invalid scheduledAt format. Use ISO local date-time"
                ));
            }

            if (!scheduledInstant.isAfter(Instant.now())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "error", "INVALID_INPUT",
                        "message", "scheduledAt must be in the future"
                ));
            }
        }
        String senderId = getCurrentUserId(authentication);
        if (senderId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "UNAUTHORIZED",
                    "message", "Authentication is required"
            ));
        }

        Set<Role> targetRoles = new LinkedHashSet<>();
        for (String roleName : request.getRoles()) {
            String normalized = blankToNull(roleName);
            if (normalized == null) {
                continue;
            }
            try {
                targetRoles.add(Role.valueOf(normalized));
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "error", "INVALID_INPUT",
                        "message", "Invalid role: " + roleName
                ));
            }
        }

        if (targetRoles.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "INVALID_INPUT",
                    "message", "At least one valid role is required"
            ));
        }

        List<User> recipients = userRepository.findAll().stream()
                .filter(User::isActive)
                .filter(user -> user.getRoles() != null && user.getRoles().stream().anyMatch(targetRoles::contains))
                .toList();

        if (recipients.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                "message", "No active recipients found for selected roles",
                "recipients", 0,
                "recipientIds", List.of()
            ));
        }

        String normalizedMode = scheduled ? "SCHEDULED" : "NOW";

        if (scheduled) {
            Instant finalScheduledInstant = scheduledInstant;
            customNotificationScheduler.schedule(
                () -> sendToRecipients(recipients, title, message, senderId, targetRoles, normalizedMode, finalScheduledInstant),
                Date.from(finalScheduledInstant)
            );

            return ResponseEntity.ok(Map.of(
                "message", "Custom notification scheduled",
                "scheduleMode", normalizedMode,
                "scheduledAt", finalScheduledInstant.toString(),
                "recipients", recipients.size(),
                "recipientIds", recipients.stream().map(User::getId).toList()
            ));
        }

        List<String> recipientIds = sendToRecipients(recipients, title, message, senderId, targetRoles, normalizedMode, null);

        return ResponseEntity.ok(Map.of(
            "message", "Custom notification sent",
            "scheduleMode", normalizedMode,
            "recipients", recipientIds.size(),
            "recipientIds", recipientIds
        ));
        }

        private List<String> sendToRecipients(
            List<User> recipients,
            String title,
            String message,
            String senderId,
            Set<Role> targetRoles,
            String scheduleMode,
            Instant scheduledAt
        ) {
        List<String> recipientIds = new ArrayList<>();
        for (User recipient : recipients) {
            notificationService.createNotification(
                    recipient.getId(),
                    title,
                    message,
                "CUSTOM",
                "CUSTOM",
                null,
                    senderId,
                    Map.of(
                    "targetRoles", targetRoles.toString(),
                    "scheduleMode", scheduleMode,
                    "scheduledAt", scheduledAt == null ? "" : scheduledAt.toString()
                    )
            );
            recipientIds.add(recipient.getId());
        }

        return recipientIds;
    }

    private boolean isSystemAdmin(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority -> "ROLE_SYSTEM_ADMIN".equals(authority));
    }
}
