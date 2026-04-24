package com.smartcampus.auth;

import com.smartcampus.dto.AuthUserResponse;
import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
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