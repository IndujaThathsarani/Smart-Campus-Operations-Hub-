package com.smartcampus.auth;

import com.smartcampus.dto.RoleUpdateRequest;
import com.smartcampus.dto.UserStatusUpdateRequest;
import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/system-admin")
public class SystemAdminController {

    private final UserRepository userRepository;

    public SystemAdminController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/users")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @PatchMapping("/users/{id}/roles")
    public User updateUserRoles(
            @PathVariable String id,
            @RequestBody RoleUpdateRequest request
    ) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setRoles(request.getRoles());
        return userRepository.save(user);
    }

    @PatchMapping("/users/{id}/status")
    public User updateUserStatus(
            @PathVariable String id,
            @RequestBody UserStatusUpdateRequest request
    ) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setActive(request.isActive());
        return userRepository.save(user);
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
}