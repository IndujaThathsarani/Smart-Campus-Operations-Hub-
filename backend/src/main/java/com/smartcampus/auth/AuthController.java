package com.smartcampus.auth;

import com.smartcampus.dto.AuthUserResponse;
import com.smartcampus.dto.LoginRequest;
import com.smartcampus.dto.SignupRequest;
import com.smartcampus.model.Role;
import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body("Email is required");
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body("Password is required");
        }
        if (request.getName() == null || request.getName().isBlank()) {
            return ResponseEntity.badRequest().body("Name is required");
        }

        Optional<User> existingUser = userRepository.findByEmail(request.getEmail());
        if (existingUser.isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Email already registered");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setProvider("MANUAL");
        user.setRoles(Set.of(Role.ROLE_USER));
        user.setActive(true);
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());

        User savedUser = userRepository.save(user);

        return ResponseEntity.ok(new AuthUserResponse(
                true,
                savedUser.getId(),
                savedUser.getName(),
                savedUser.getEmail(),
                savedUser.getProfilePicture(),
                savedUser.getRoles(),
                savedUser.isActive()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body("Email is required");
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body("Password is required");
        }

        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid email or password");
        }

        User user = userOpt.get();
        if (user.getPassword() == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid email or password");
        }

        if (!user.isActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("User account is inactive");
        }

        HttpSession session = httpRequest.getSession(true);
        session.setAttribute("SPRING_SECURITY_CONTEXT", user.getEmail());

        return ResponseEntity.ok(new AuthUserResponse(
                true,
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getProfilePicture(),
                user.getRoles(),
                user.isActive()
        ));
    }

    @GetMapping("/me")
    public AuthUserResponse getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new AuthUserResponse(false);
        }

        if (authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))) {
            return new AuthUserResponse(false);
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
            return new AuthUserResponse(false);
        }

        User user = userRepository.findByEmail(email)
                .orElse(null);

        if (user == null) {
            return new AuthUserResponse(false);
        }

        return new AuthUserResponse(
                true,
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getProfilePicture(),
                user.getRoles(),
                user.isActive()
        );
    }
}