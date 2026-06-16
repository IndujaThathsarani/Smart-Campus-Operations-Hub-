package com.smartcampus.auth;

import com.smartcampus.model.Role;
import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;

@Service
public class UserAuthService {

    private final UserRepository userRepository;
    private final RoleService roleService;

    public UserAuthService(UserRepository userRepository, RoleService roleService) {
        this.userRepository = userRepository;
        this.roleService = roleService;
    }

    public User findOrCreateGoogleUser(
            String name,
            String email,
            String profilePicture,
            String providerId
    ) {
        Optional<User> existingUser = userRepository.findByEmail(email);

        if (existingUser.isPresent()) {
            User user = existingUser.get();
            user.setName(name);
            user.setProfilePicture(profilePicture);
            user.setProvider("GOOGLE");
            user.setProviderId(providerId);

            // Preserve roles already saved in DB by system admin updates.
            // Only assign from mapping when a legacy user has no role set.
            if (user.getRoles() == null || user.getRoles().isEmpty()) {
                Role assignedRole = roleService.getRoleForEmail(email);
                user.setRoles(Set.of(assignedRole));
            }
            
            user.setUpdatedAt(Instant.now());
            return userRepository.save(user);
        }

        User newUser = new User();
        newUser.setName(name);
        newUser.setEmail(email);
        newUser.setProfilePicture(profilePicture);
        newUser.setProvider("GOOGLE");
        newUser.setProviderId(providerId);
        
        // Assign role from RoleService based on email mapping
        Role assignedRole = roleService.getRoleForEmail(email);
        newUser.setRoles(Set.of(assignedRole));
        
        newUser.setActive(true);
        newUser.setCreatedAt(Instant.now());
        newUser.setUpdatedAt(Instant.now());

        return userRepository.save(newUser);
    }
}
