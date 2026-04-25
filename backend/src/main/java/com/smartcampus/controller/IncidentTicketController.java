package com.smartcampus.controller;

import com.smartcampus.dto.TicketAssignmentUpdateRequest;
import com.smartcampus.dto.TicketCommentRequest;
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
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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
            @RequestBody(required = false) TicketCommentRequest request
    ) {
        IncidentTicket updated = incidentTicketService.addComment(
                ticketId,
                request != null ? request.getBody() : null,
                request != null ? request.getAuthor() : null
        );
        return new ResponseEntity<>(updated, HttpStatus.CREATED);
    }

    @PatchMapping(path = "/{ticketId}/comments/{commentId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<IncidentTicket> setCommentHidden(
            @PathVariable("ticketId") String ticketId,
            @PathVariable("commentId") String commentId,
            @RequestBody(required = false) TicketCommentVisibilityRequest request
    ) {
        boolean hidden = request != null && request.isHidden();
        IncidentTicket updated = incidentTicketService.setCommentHidden(ticketId, commentId, hidden);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{ticketId}/comments/{commentId}")
    public ResponseEntity<IncidentTicket> deleteComment(
            @PathVariable("ticketId") String ticketId,
            @PathVariable("commentId") String commentId
    ) {
        IncidentTicket updated = incidentTicketService.deleteComment(ticketId, commentId);
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
}
