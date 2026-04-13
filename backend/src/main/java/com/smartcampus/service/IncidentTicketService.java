package com.smartcampus.service;

import com.smartcampus.model.IncidentTicket;
import com.smartcampus.repository.IncidentTicketRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class IncidentTicketService {

    private static final int MAX_ATTACHMENTS = 3;

    private final IncidentTicketRepository incidentTicketRepository;

    @Value("${app.upload.dir:uploads/tickets}")
    private String uploadDir;

    public IncidentTicketService(IncidentTicketRepository incidentTicketRepository) {
        this.incidentTicketRepository = incidentTicketRepository;
    }

    public IncidentTicket createWithAttachments(
            String location,
            String categoryRaw,
            String priorityRaw,
            String description,
            String contactEmail,
            String contactPhone,
            MultipartFile[] files
    ) {
        String loc = blankToNull(location);
        if (loc == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Location is required");
        }

        String email = blankToNull(contactEmail);
        String phone = blankToNull(contactPhone);
        if (email == null && phone == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide at least an email or a phone number");
        }

        if (description == null || description.trim().length() < 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Description must be at least 10 characters");
        }
        if (description.length() > 4000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Description must be at most 4000 characters");
        }

        IncidentTicket.Category category;
        IncidentTicket.Priority priority;
        try {
            category = IncidentTicket.Category.valueOf(categoryRaw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid category");
        }
        try {
            priority = IncidentTicket.Priority.valueOf(priorityRaw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid priority");
        }

        List<MultipartFile> incoming = new ArrayList<>();
        if (files != null) {
            for (MultipartFile f : files) {
                if (f != null && !f.isEmpty()) {
                    incoming.add(f);
                }
            }
        }
        if (incoming.size() > MAX_ATTACHMENTS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At most 3 images allowed");
        }

        IncidentTicket ticket = new IncidentTicket();
        ticket.setLocation(loc);
        ticket.setCategory(category);
        ticket.setPriority(priority);
        ticket.setDescription(description.trim());
        ticket.setContactEmail(email);
        ticket.setContactPhone(phone);
        ticket.setStatus(IncidentTicket.Status.OPEN);
        ticket.setCreatedAt(Instant.now());
        ticket.setAttachmentFileNames(new ArrayList<>());

        IncidentTicket saved = incidentTicketRepository.save(ticket);
        String ticketId = saved.getId();

        List<String> storedNames = new ArrayList<>();
        if (!incoming.isEmpty()) {
            Path dir = Paths.get(uploadDir).resolve(ticketId).normalize();
            try {
                Files.createDirectories(dir);
            } catch (IOException e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not create upload directory");
            }

            for (MultipartFile f : incoming) {
                String ct = f.getContentType();
                if (ct == null || !ct.startsWith("image/")) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only image files are allowed");
                }
                String safe = sanitizeFilename(f.getOriginalFilename());
                Path target = dir.resolve(safe);
                try (InputStream in = f.getInputStream()) {
                    Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
                } catch (IOException e) {
                    throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store file");
                }
                storedNames.add(safe);
            }
        }

        saved.setAttachmentFileNames(storedNames);
        return incidentTicketRepository.save(saved);
    }

    public List<IncidentTicket> findAll() {
        return incidentTicketRepository.findAllByOrderByCreatedAtDesc();
    }

    private static String blankToNull(String s) {
        if (s == null || s.isBlank()) {
            return null;
        }
        return s.trim();
    }

    private static String sanitizeFilename(String original) {
        if (original == null || original.isBlank()) {
            return "image.bin";
        }
        String name = original.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (name.length() > 120) {
            name = name.substring(name.length() - 120);
        }
        return name;
    }
}
