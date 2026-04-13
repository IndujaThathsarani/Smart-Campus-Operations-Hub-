package com.smartcampus.controller;

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
@CrossOrigin(origins = "http://localhost:5173")
public class IncidentTicketController {

    private final IncidentTicketService incidentTicketService;

    public IncidentTicketController(IncidentTicketService incidentTicketService) {
        this.incidentTicketService = incidentTicketService;
    }

    @GetMapping
    public ResponseEntity<List<IncidentTicket>> list() {
        return ResponseEntity.ok(incidentTicketService.findAll());
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
}
