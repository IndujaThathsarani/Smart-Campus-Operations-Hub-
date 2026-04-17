package com.smartcampus.controller;

import com.smartcampus.dto.TicketAssignmentUpdateRequest;
import com.smartcampus.dto.TicketCommentRequest;
import com.smartcampus.dto.TicketCommentVisibilityRequest;
import com.smartcampus.dto.TicketStatusUpdateRequest;
import com.smartcampus.model.IncidentTicket;
import com.smartcampus.service.IncidentTicketService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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

    public IncidentTicketController(IncidentTicketService incidentTicketService) {
        this.incidentTicketService = incidentTicketService;
    }

    @GetMapping
    public ResponseEntity<List<IncidentTicket>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String category
    ) {
        return ResponseEntity.ok(incidentTicketService.findAllFiltered(status, priority, category));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<IncidentTicket> create(
            @RequestParam("location") String location,
            @RequestParam("category") String category,
            @RequestParam("priority") String priority,
            @RequestParam("description") String description,
            @RequestParam(value = "contactEmail", required = false) String contactEmail,
            @RequestParam(value = "contactPhone", required = false) String contactPhone,
            @RequestParam(value = "files", required = false) MultipartFile[] files
    ) {
        IncidentTicket created = incidentTicketService.createWithAttachments(
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
}
