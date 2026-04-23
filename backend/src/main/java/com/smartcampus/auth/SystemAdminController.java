package com.smartcampus.auth;

import com.smartcampus.dto.RoleUpdateRequest;
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

    // Get all users
    @GetMapping("/users")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // Update roles
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
}