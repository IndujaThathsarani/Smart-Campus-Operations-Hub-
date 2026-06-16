package com.smartcampus.auth;

import com.smartcampus.model.Role;
import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Component
public class DefaultManualUsersSeeder implements CommandLineRunner {

    private static final String DEFAULT_PASSWORD = "campus123";

    private final UserRepository userRepository;
    private final RoleService roleService;
    private final PasswordEncoder passwordEncoder;

    public DefaultManualUsersSeeder(
            UserRepository userRepository,
            RoleService roleService,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.roleService = roleService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        Map<String, String> displayNames = Map.of(
                "buddhimasankalapa@gmai.com", "Campus User",
                "buddhimasankalapa@gmail.com", "Campus User",
                "janithsgunasekara003@gmail.com", "Campus Admin",
                "tiranrawishan@gmail.com", "System Administrator",
                "induthathsarani@gmail.com", "Campus Technician"
        );

        for (Map.Entry<String, Role> entry : roleService.getAllEmailRoleMappings().entrySet()) {
            String email = roleService.normalizeEmail(entry.getKey());
            Role role = entry.getValue();

            Optional<User> existingOpt = userRepository.findByEmail(email);
            if (existingOpt.isPresent()) {
                User existing = existingOpt.get();
                existing.setRoles(Set.of(role));
                existing.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));

                if (existing.getProvider() == null || existing.getProvider().isBlank()) {
                    existing.setProvider("MANUAL");
                }

                if (existing.getName() == null || existing.getName().isBlank()) {
                    existing.setName(displayNames.getOrDefault(email, "Campus User"));
                }

                existing.setActive(true);
                existing.setUpdatedAt(Instant.now());
                userRepository.save(existing);
                continue;
            }

            User user = new User();
            user.setName(displayNames.getOrDefault(email, "Campus User"));
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));
            user.setProvider("MANUAL");
            user.setRoles(Set.of(role));
            user.setActive(true);
            user.setCreatedAt(Instant.now());
            user.setUpdatedAt(Instant.now());
            userRepository.save(user);
        }
    }
}
