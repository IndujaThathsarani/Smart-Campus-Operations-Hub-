package com.smartcampus.service;

import com.smartcampus.model.IncidentTicket;
import com.smartcampus.model.Resource;
import com.smartcampus.model.TicketComment;
import com.smartcampus.repository.IncidentTicketRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.annotation.Id;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

@Service
public class IncidentTicketService {

    private static final int MAX_ATTACHMENTS = 3;
    private static final String TICKET_COUNTER_COLLECTION = "ticket_counters";

    private final IncidentTicketRepository incidentTicketRepository;

    private final MongoTemplate mongoTemplate;

    @Value("${app.upload.dir:uploads/tickets}")
    private String uploadDir;

    public IncidentTicketService(IncidentTicketRepository incidentTicketRepository, MongoTemplate mongoTemplate) {
        this.incidentTicketRepository = incidentTicketRepository;
        this.mongoTemplate = mongoTemplate;
    }

    // Create incident ticket with attachments and optional resource linking (validates and sets resourceId)
    public IncidentTicket createWithAttachments(
            String resourceIdRaw,
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
        String resourceId = blankToNull(resourceIdRaw);
        if (email == null && phone == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide at least an email or a phone number");
        }
        if (resourceId != null) {
            Query resourceQuery = new Query(Criteria.where("_id").is(resourceId));
            if (!mongoTemplate.exists(resourceQuery, Resource.class)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected resource does not exist");
            }
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
        ticket.setResourceId(resourceId);
        ticket.setLocation(loc);
        ticket.setCategory(category);
        ticket.setPriority(priority);
        ticket.setDescription(description.trim());
        ticket.setContactEmail(email);
        ticket.setContactPhone(phone);
        ticket.setStatus(IncidentTicket.Status.OPEN);
        Instant now = Instant.now();
        ticket.setCreatedAt(now);
        ticket.setTicketNumber(generateTicketNumber(now));
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

    public List<IncidentTicket> findAllFiltered(String statusRaw, String priorityRaw, String categoryRaw) {
        String status = blankToNull(statusRaw);
        String priority = blankToNull(priorityRaw);
        String category = blankToNull(categoryRaw);
        if (status == null && priority == null && category == null) {
            return ensureTicketNumbers(incidentTicketRepository.findAllByOrderByCreatedAtDesc());
        }

        Query query = new Query();
        if (status != null) {
            try {
                query.addCriteria(Criteria.where("status").is(
                        IncidentTicket.Status.valueOf(status.toUpperCase(Locale.ROOT))));
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status filter");
            }
        }
        if (priority != null) {
            try {
                query.addCriteria(Criteria.where("priority").is(
                        IncidentTicket.Priority.valueOf(priority.toUpperCase(Locale.ROOT))));
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid priority filter");
            }
        }
        if (category != null) {
            try {
                query.addCriteria(Criteria.where("category").is(
                        IncidentTicket.Category.valueOf(category.toUpperCase(Locale.ROOT))));
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid category filter");
            }
        }

        query.with(Sort.by(Sort.Direction.DESC, "createdAt"));
        return ensureTicketNumbers(mongoTemplate.find(query, IncidentTicket.class));
    }

    public IncidentTicket updateStatus(String ticketId, String statusRaw, String rejectReasonRaw) {
        String id = blankToNull(ticketId);
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ticket id is required");
        }
        String statusText = blankToNull(statusRaw);
        if (statusText == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status is required");
        }

        IncidentTicket.Status status;
        try {
            status = IncidentTicket.Status.valueOf(statusText.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status");
        }

        Optional<IncidentTicket> maybeTicket = incidentTicketRepository.findById(id);
        IncidentTicket ticket = maybeTicket.orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found")
        );

        String rejectReason = blankToNull(rejectReasonRaw);
        if (status == IncidentTicket.Status.REJECTED) {
            if (rejectReason == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reject reason is required when status is REJECTED");
            }
            if (rejectReason.length() > 500) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reject reason must be at most 500 characters");
            }
            ticket.setRejectReason(rejectReason);
        } else {
            ticket.setRejectReason(null);
        }

        ticket.setStatus(status);
        return incidentTicketRepository.save(ticket);
    }

    public IncidentTicket updateAssignment(String ticketId, String assignedToRaw) {
        String id = blankToNull(ticketId);
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ticket id is required");
        }
        Optional<IncidentTicket> maybeTicket = incidentTicketRepository.findById(id);
        IncidentTicket ticket = maybeTicket.orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found")
        );
        String assigned = blankToNull(assignedToRaw);
        if (assigned != null && assigned.length() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assigned to must be at most 200 characters");
        }
        ticket.setAssignedTo(assigned);
        return incidentTicketRepository.save(ticket);
    }

    public IncidentTicket addComment(
            String ticketId,
            String bodyRaw,
            String ownerIdRaw,
            String ownerEmailRaw,
            String authorRaw
    ) {
        IncidentTicket ticket = requireTicketById(ticketId);
        String body = blankToNull(bodyRaw);
        if (body == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment body is required");
        }
        if (body.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment must be at most 2000 characters");
        }
        String author = blankToNull(authorRaw);
        if (author != null && author.length() > 80) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Author label must be at most 80 characters");
        }
        if (author == null) {
            author = "ADMIN";
        }
        String ownerId = blankToNull(ownerIdRaw);
        if (ownerId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        String ownerEmail = blankToNull(ownerEmailRaw);
        if (ticket.getComments() == null) {
            ticket.setComments(new ArrayList<>());
        }
        Instant now = Instant.now();
        TicketComment c = new TicketComment();
        c.setId(UUID.randomUUID().toString());
        c.setAuthor(author);
        c.setOwnerId(ownerId);
        c.setOwnerEmail(ownerEmail);
        c.setBody(body);
        c.setCreatedAt(now);
        c.setUpdatedAt(now);
        c.setHidden(false);
        ticket.getComments().add(c);
        return incidentTicketRepository.save(ticket);
    }

    public IncidentTicket updateComment(String ticketId, String commentId, String bodyRaw, String ownerIdRaw) {
        IncidentTicket ticket = requireTicketById(ticketId);
        TicketComment comment = requireComment(ticket, commentId);
        requireCommentOwner(comment, ownerIdRaw);

        String body = blankToNull(bodyRaw);
        if (body == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment body is required");
        }
        if (body.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment must be at most 2000 characters");
        }

        comment.setBody(body);
        comment.setUpdatedAt(Instant.now());
        return incidentTicketRepository.save(ticket);
    }

    public IncidentTicket setCommentHidden(String ticketId, String commentId, boolean hidden) {
        IncidentTicket ticket = requireTicketById(ticketId);
        TicketComment comment = requireComment(ticket, commentId);
        comment.setHidden(hidden);
        return incidentTicketRepository.save(ticket);
    }

    public IncidentTicket deleteComment(String ticketId, String commentId, String ownerIdRaw) {
        IncidentTicket ticket = requireTicketById(ticketId);
        String cid = blankToNull(commentId);
        if (cid == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment id is required");
        }
        List<TicketComment> list = ticket.getComments();
        if (list == null || list.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found");
        }
        TicketComment comment = requireComment(ticket, cid);
        requireCommentOwner(comment, ownerIdRaw);
        boolean removed = list.removeIf((c) -> cid.equals(c.getId()));
        if (!removed) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found");
        }
        return incidentTicketRepository.save(ticket);
    }

    private IncidentTicket requireTicketById(String ticketId) {
        String id = blankToNull(ticketId);
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ticket id is required");
        }
        return incidentTicketRepository.findById(id).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found")
        );
    }

    private static TicketComment requireComment(IncidentTicket ticket, String commentId) {
        String cid = blankToNull(commentId);
        if (cid == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment id is required");
        }
        List<TicketComment> list = ticket.getComments();
        if (list == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found");
        }
        for (TicketComment c : list) {
            if (cid.equals(c.getId())) {
                return c;
            }
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found");
    }

    private static void requireCommentOwner(TicketComment comment, String ownerIdRaw) {
        String ownerId = blankToNull(ownerIdRaw);
        if (ownerId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        if (!ownerId.equals(blankToNull(comment.getOwnerId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the comment owner can modify this comment");
        }
    }

    public void deleteById(String ticketId) {
        String id = blankToNull(ticketId);
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ticket id is required");
        }
        if (!incidentTicketRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found");
        }
        Path base = Paths.get(uploadDir).normalize().toAbsolutePath();
        Path ticketDir = base.resolve(id).normalize();
        if (!ticketDir.startsWith(base)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid ticket id");
        }
        deleteUploadDirectoryIfPresent(ticketDir);
        incidentTicketRepository.deleteById(id);
    }

    private static void deleteUploadDirectoryIfPresent(Path dir) {
        if (!Files.exists(dir)) {
            return;
        }
        try (Stream<Path> walk = Files.walk(dir)) {
            walk.sorted(Comparator.reverseOrder()).forEach((path) -> {
                try {
                    Files.delete(path);
                } catch (IOException e) {
                    throw new UncheckedIOException(e);
                }
            });
        } catch (UncheckedIOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not remove ticket uploads");
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not remove ticket uploads");
        }
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

    private String generateTicketNumber(Instant now) {
        int year = now.atZone(ZoneOffset.UTC).getYear();
        long seq = nextTicketSequence(year);
        return String.format("INC-%d-%04d", year, seq);
    }

    private List<IncidentTicket> ensureTicketNumbers(List<IncidentTicket> tickets) {
        if (tickets == null || tickets.isEmpty()) {
            return tickets;
        }
        boolean changed = false;
        for (IncidentTicket ticket : tickets) {
            if (blankToNull(ticket.getTicketNumber()) != null) {
                continue;
            }
            Instant base = ticket.getCreatedAt() != null ? ticket.getCreatedAt() : Instant.now();
            ticket.setTicketNumber(generateTicketNumber(base));
            changed = true;
        }
        if (changed) {
            incidentTicketRepository.saveAll(tickets);
        }
        return tickets;
    }

    private long nextTicketSequence(int year) {
        String counterId = "incident_ticket_" + year;
        Query query = new Query(Criteria.where("_id").is(counterId));
        Update update = new Update().inc("seq", 1L);
        FindAndModifyOptions options = FindAndModifyOptions.options().returnNew(true).upsert(true);
        TicketCounter counter = mongoTemplate.findAndModify(query, update, options, TicketCounter.class, TICKET_COUNTER_COLLECTION);
        if (counter == null || counter.seq <= 0) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not generate ticket number");
        }
        return counter.seq;
    }

    private static class TicketCounter {
        @Id
        private String id;
        private long seq;
    }
}
