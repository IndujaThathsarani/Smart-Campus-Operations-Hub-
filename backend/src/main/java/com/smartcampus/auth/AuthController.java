package com.smartcampus.auth;

import com.smartcampus.dto.AuthUserResponse;
import com.smartcampus.dto.LoginRequest;
import com.smartcampus.dto.SignupRequest;
import com.smartcampus.dto.ChangeRoleRequest;
import com.smartcampus.model.Role;
import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;
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
    private final RoleService roleService;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, RoleService roleService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.roleService = roleService;
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

        String normalizedEmail = roleService.normalizeEmail(request.getEmail());

        Optional<User> existingUser = userRepository.findByEmail(normalizedEmail);
        if (existingUser.isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Email already registered");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setProvider("MANUAL");
        
        // Assign role from RoleService based on email mapping
        Role assignedRole = roleService.getRoleForEmail(normalizedEmail);
        user.setRoles(Set.of(assignedRole));
        
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

        String normalizedEmail = roleService.normalizeEmail(request.getEmail());

        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);
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

        // Sync roles with role service mapping (in case role was changed)
        Role assignedRole = roleService.getRoleForEmail(normalizedEmail);
        user.setRoles(Set.of(assignedRole));
        userRepository.save(user);

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
            normalizedEmail,
            null,
            user.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority(role.name()))
                .toList()
        );

        SecurityContextImpl securityContext = new SecurityContextImpl();
        securityContext.setAuthentication(authentication);
        SecurityContextHolder.setContext(securityContext);

        HttpSession session = httpRequest.getSession(true);
        session.setAttribute("SPRING_SECURITY_CONTEXT", securityContext);

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

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok("Logged out successfully");
    }

    @PostMapping("/change-role")
    public ResponseEntity<?> changeUserRole(@RequestBody ChangeRoleRequest request, Authentication authentication) {
        // Check if current user is SYSTEM_ADMIN
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Not authenticated");
        }

        String currentUserEmail = null;
        Object principal = authentication.getPrincipal();

        if (principal instanceof OAuth2User oAuth2User) {
            currentUserEmail = oAuth2User.getAttribute("email");
        }

        if (currentUserEmail == null || currentUserEmail.isBlank()) {
            currentUserEmail = authentication.getName();
        }

        // Verify current user is SYSTEM_ADMIN
        if (!roleService.isSystemAdmin(currentUserEmail)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only SYSTEM_ADMIN can change user roles");
        }

        if (request.getTargetEmail() == null || request.getTargetEmail().isBlank()) {
            return ResponseEntity.badRequest().body("Target email is required");
        }

        if (request.getNewRole() == null) {
            return ResponseEntity.badRequest().body("New role is required");
        }

        // Find the target user
        String normalizedTargetEmail = roleService.normalizeEmail(request.getTargetEmail());

        Optional<User> targetUserOpt = userRepository.findByEmail(normalizedTargetEmail);
        if (targetUserOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        // Update the role mapping and user
        User targetUser = targetUserOpt.get();
        roleService.updateEmailRoleMapping(normalizedTargetEmail, request.getNewRole());
        targetUser.setRoles(Set.of(request.getNewRole()));
        targetUser.setUpdatedAt(Instant.now());
        
        User updatedUser = userRepository.save(targetUser);

        return ResponseEntity.ok(new AuthUserResponse(
                true,
                updatedUser.getId(),
                updatedUser.getName(),
                updatedUser.getEmail(),
                updatedUser.getProfilePicture(),
                updatedUser.getRoles(),
                updatedUser.isActive()
        ));
    }
}