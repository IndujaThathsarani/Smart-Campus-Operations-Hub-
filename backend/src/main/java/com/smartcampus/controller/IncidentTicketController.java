package com.smartcampus.controller;

import com.smartcampus.dto.TicketAssignmentUpdateRequest;
import com.smartcampus.dto.TicketCommentRequest;
import com.smartcampus.dto.TicketCommentUpdateRequest;
import com.smartcampus.dto.TicketCommentVisibilityRequest;
import com.smartcampus.dto.TicketStatusUpdateRequest;
import com.smartcampus.dto.TechnicianOptionResponse;
import com.smartcampus.model.IncidentTicket;
import com.smartcampus.model.Role;
import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
import com.smartcampus.service.IncidentTicketService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/tickets")
@CrossOrigin(
        origins = {"http://localhost:5173", "http://127.0.0.1:5173"},
        methods = {
                RequestMethod.GET,
                RequestMethod.POST,
                RequestMethod.PATCH,
                RequestMethod.DELETE,
                RequestMethod.OPTIONS
        },
        allowedHeaders = "*"
)
public class IncidentTicketController {

    private final IncidentTicketService incidentTicketService;
    private final UserRepository userRepository;

    public IncidentTicketController(
            IncidentTicketService incidentTicketService,
            UserRepository userRepository
    ) {
        this.incidentTicketService = incidentTicketService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<IncidentTicket>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String category
    ) {
        return ResponseEntity.ok(incidentTicketService.findAllFiltered(status, priority, category));
    }

    @GetMapping("/technicians")
    public ResponseEntity<List<TechnicianOptionResponse>> listTechnicians() {
        List<TechnicianOptionResponse> technicians = userRepository.findAll()
                .stream()
                .filter(User::isActive)
                .filter(user -> user.getRoles() != null && user.getRoles().contains(Role.ROLE_TECHNICIAN))
                .map(user -> {
                    String label = technicianLabel(user);
                    return new TechnicianOptionResponse(
                            user.getId(),
                            user.getName(),
                            user.getEmail(),
                            label
                    );
                })
                .sorted(Comparator.comparing(TechnicianOptionResponse::getLabel, String.CASE_INSENSITIVE_ORDER))
                .toList();

        return ResponseEntity.ok(technicians);
    }

    // Create incident ticket with optional resource linking (receives resourceId from frontend form)
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<IncidentTicket> create(
            @RequestParam(value = "resourceId", required = false) String resourceId,
            @RequestParam("location") String location,
            @RequestParam("category") String category,
            @RequestParam("priority") String priority,
            @RequestParam("description") String description,
            @RequestParam(value = "contactEmail", required = false) String contactEmail,
            @RequestParam(value = "contactPhone", required = false) String contactPhone,
            @RequestParam(value = "files", required = false) MultipartFile[] files
    ) {
        IncidentTicket created = incidentTicketService.createWithAttachments(
                resourceId,
                location,
                category,
                priority,
                description,
                contactEmail,
                contactPhone,
                files
        );
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PatchMapping(path = "/{ticketId}/status", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<IncidentTicket> updateStatus(
            @PathVariable("ticketId") String ticketId,
            @RequestBody TicketStatusUpdateRequest request
    ) {
        IncidentTicket updated = incidentTicketService.updateStatus(
                ticketId,
                request != null ? request.getStatus() : null,
                request != null ? request.getRejectReason() : null
        );
        return ResponseEntity.ok(updated);
    }

    @PatchMapping(path = "/{ticketId}/assignment", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<IncidentTicket> updateAssignment(
            @PathVariable("ticketId") String ticketId,
            @RequestBody(required = false) TicketAssignmentUpdateRequest request
    ) {
        IncidentTicket updated = incidentTicketService.updateAssignment(
                ticketId,
                request != null ? request.getAssignedTo() : null
        );
        return ResponseEntity.ok(updated);
    }

    @PostMapping(path = "/{ticketId}/comments", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<IncidentTicket> addComment(
            @PathVariable("ticketId") String ticketId,
            @RequestBody(required = false) TicketCommentRequest request,
            Authentication authentication
    ) {
        User currentUser = requireCurrentUser(authentication);
        IncidentTicket updated = incidentTicketService.addComment(
                ticketId,
                request != null ? request.getBody() : null,
                currentUser.getId(),
                currentUser.getEmail(),
                commentAuthorLabel(currentUser)
        );
        return new ResponseEntity<>(updated, HttpStatus.CREATED);
    }

    @PatchMapping(path = "/{ticketId}/comments/{commentId}/body", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<IncidentTicket> updateComment(
            @PathVariable("ticketId") String ticketId,
            @PathVariable("commentId") String commentId,
            @RequestBody(required = false) TicketCommentUpdateRequest request,
            Authentication authentication
    ) {
        User currentUser = requireCurrentUser(authentication);
        IncidentTicket updated = incidentTicketService.updateComment(
                ticketId,
                commentId,
                request != null ? request.getBody() : null,
                currentUser.getId()
        );
        return ResponseEntity.ok(updated);
    }

    @PatchMapping(path = "/{ticketId}/comments/{commentId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<IncidentTicket> setCommentHidden(
            @PathVariable("ticketId") String ticketId,
            @PathVariable("commentId") String commentId,
            @RequestBody(required = false) TicketCommentVisibilityRequest request,
            Authentication authentication
    ) {
        requireStaffUser(authentication);
        boolean hidden = request != null && request.isHidden();
        IncidentTicket updated = incidentTicketService.setCommentHidden(ticketId, commentId, hidden);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{ticketId}/comments/{commentId}")
    public ResponseEntity<IncidentTicket> deleteComment(
            @PathVariable("ticketId") String ticketId,
            @PathVariable("commentId") String commentId,
            Authentication authentication
    ) {
        User currentUser = requireCurrentUser(authentication);
        IncidentTicket updated = incidentTicketService.deleteComment(ticketId, commentId, currentUser.getId());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{ticketId}")
    public ResponseEntity<Void> delete(@PathVariable("ticketId") String ticketId) {
        incidentTicketService.deleteById(ticketId);
        return ResponseEntity.noContent().build();
    }

    private static String technicianLabel(User user) {
        String name = blankToNull(user.getName());
        String email = blankToNull(user.getEmail());

        if (name != null && email != null) {
            return name + " (" + email + ")";
        }
        if (name != null) {
            return name;
        }
        if (email != null) {
            return email;
        }
        return user.getId();
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private User requireCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }

        String email = resolveCurrentUserEmail(authentication);
        if (email == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current user was not found"));
    }

    private void requireStaffUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }

        boolean allowed = authentication.getAuthorities()
                .stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority ->
                        "ROLE_ADMIN".equals(authority)
                                || "ROLE_SYSTEM_ADMIN".equals(authority)
                                || "ROLE_TECHNICIAN".equals(authority)
                );

        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only staff can moderate ticket comments");
        }
    }

    private static String resolveCurrentUserEmail(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof OAuth2User oAuth2User) {
            return blankToNull(oAuth2User.getAttribute("email"));
        }
        return blankToNull(authentication.getName());
    }

    private static String commentAuthorLabel(User user) {
        String name = blankToNull(user.getName());
        String email = blankToNull(user.getEmail());

        if (name != null) {
            return name;
        }
        if (email != null) {
            return email;
        }
        return user.getId();
    }
}
