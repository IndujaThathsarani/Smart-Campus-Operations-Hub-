package com.smartcampus.auth;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @GetMapping("/me")
    public Map<String, Object> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return Map.of("authenticated", false);
        }

        OAuth2User user = (OAuth2User) authentication.getPrincipal();

        return Map.of(
                "authenticated", true,
                "name", user.getAttribute("name"),
                "email", user.getAttribute("email"),
                "picture", user.getAttribute("picture")
        );
    }
}