package com.smartcampus.auth;

import com.smartcampus.dto.RoleUpdateRequest;
import com.smartcampus.dto.UserStatusUpdateRequest;
import com.smartcampus.model.Role;
import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
import com.smartcampus.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/system-admin")
public class SystemAdminController {

    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public SystemAdminController(UserRepository userRepository, NotificationService notificationService) {
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @GetMapping("/users")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @PatchMapping("/users/{id}/roles")
    public User updateUserRoles(
            @PathVariable String id,
            @RequestBody RoleUpdateRequest request,
            Authentication authentication
    ) {
        if (request.getRoles() == null || request.getRoles().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one role is required");
        }

        Set<Role> mappedRoles = new LinkedHashSet<>();
        for (String roleName : request.getRoles()) {
            if (roleName == null || roleName.isBlank()) {
                continue;
            }
            try {
                mappedRoles.add(Role.valueOf(roleName.trim()));
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role: " + roleName);
            }
        }

        if (mappedRoles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one valid role is required");
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Set<Role> previousRoles = new LinkedHashSet<>(user.getRoles());

        user.setRoles(mappedRoles);
        User saved = userRepository.save(user);
        notificationService.createNotification(
            saved.getId(),
            "Access level updated",
            "Your account roles changed from " + previousRoles + " to " + mappedRoles + ".",
            "ACCOUNT_ROLE_CHANGED",
            "USER",
            saved.getId(),
            getCurrentUserId(authentication),
            Map.of(
                "previousRoles", previousRoles.toString(),
                "newRoles", mappedRoles.toString()
            )
        );
        return saved;
    }

    @PatchMapping("/users/{id}/status")
    public User updateUserStatus(
            @PathVariable String id,
            @RequestBody UserStatusUpdateRequest request,
            Authentication authentication
    ) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean previousActive = user.isActive();

        user.setActive(request.isActive());
        User saved = userRepository.save(user);
        notificationService.createNotification(
            saved.getId(),
            "Account status updated",
            "Your account is now " + (saved.isActive() ? "active" : "inactive") + ".",
            "ACCOUNT_STATUS_CHANGED",
            "USER",
            saved.getId(),
            getCurrentUserId(authentication),
            Map.of(
                "previousActive", String.valueOf(previousActive),
                "newActive", String.valueOf(saved.isActive())
            )
        );
        return saved;
    }

    @GetMapping("/stats")
public java.util.Map<String, Long> getSystemAdminStats() {
    List<User> users = userRepository.findAll();

    long totalUsers = users.size();
    long activeUsers = users.stream().filter(User::isActive).count();
    long admins = users.stream().filter(user -> user.getRoles().contains(com.smartcampus.model.Role.ROLE_ADMIN)).count();
    long technicians = users.stream().filter(user -> user.getRoles().contains(com.smartcampus.model.Role.ROLE_TECHNICIAN)).count();
    long systemAdmins = users.stream().filter(user -> user.getRoles().contains(com.smartcampus.model.Role.ROLE_SYSTEM_ADMIN)).count();

    return java.util.Map.of(
            "totalUsers", totalUsers,
            "activeUsers", activeUsers,
            "admins", admins,
            "technicians", technicians,
            "systemAdmins", systemAdmins
    );
}

    private String getCurrentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        String email = null;
        Object principal = authentication.getPrincipal();
        if (principal instanceof OAuth2User oAuth2User) {
            email = oAuth2User.getAttribute("email");
        }
        if (email == null || email.isBlank()) {
            email = authentication.getName();
        }
        if (email == null || email.isBlank()) {
            return null;
        }

        return userRepository.findByEmail(email).map(User::getId).orElse(null);
    }
}
