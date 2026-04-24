package com.smartcampus.auth;

import com.smartcampus.model.User;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final UserAuthService userAuthService;
    private final String frontendBaseUrl;

    public OAuth2LoginSuccessHandler(
            UserAuthService userAuthService,
            @Value("${app.frontend.base-url:http://localhost:5173}") String frontendBaseUrl
    ) {
        this.userAuthService = userAuthService;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String name = oAuth2User.getAttribute("name");
        String email = oAuth2User.getAttribute("email");
        String picture = oAuth2User.getAttribute("picture");
        String providerId = oAuth2User.getAttribute("sub");

        User user = userAuthService.findOrCreateGoogleUser(
                name,
                email,
                picture,
                providerId
        );

        String redirectUrl = determineRedirectUrl(user);
        response.sendRedirect(redirectUrl);
    }

    private String determineRedirectUrl(User user) {
        String base = frontendBaseUrl.endsWith("/")
                ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
                : frontendBaseUrl;

        if (user.getRoles().contains(com.smartcampus.model.Role.ROLE_SYSTEM_ADMIN)) {
            return base + "/system-admin/dashboard";
        }

        if (user.getRoles().contains(com.smartcampus.model.Role.ROLE_ADMIN)) {
            return base + "/admin/catalogue";
        }

        if (user.getRoles().contains(com.smartcampus.model.Role.ROLE_TECHNICIAN)) {
            return base + "/technician/tickets";
        }

        return base + "/resources";
    }
}