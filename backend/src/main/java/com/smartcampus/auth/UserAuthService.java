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

    public UserAuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
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
            user.setUpdatedAt(Instant.now());
            return userRepository.save(user);
        }

        User newUser = new User();
        newUser.setName(name);
        newUser.setEmail(email);
        newUser.setProfilePicture(profilePicture);
        newUser.setProvider("GOOGLE");
        newUser.setProviderId(providerId);
        newUser.setRoles(Set.of(Role.ROLE_USER));
        newUser.setActive(true);
        newUser.setCreatedAt(Instant.now());
        newUser.setUpdatedAt(Instant.now());

        return userRepository.save(newUser);
    }
}