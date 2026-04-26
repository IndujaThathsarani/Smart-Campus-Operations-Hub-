package com.smartcampus.service;

import com.smartcampus.model.IncidentTicket;
import com.smartcampus.model.Resource;
import com.smartcampus.model.TicketComment;
import com.smartcampus.model.User;
import com.smartcampus.repository.IncidentTicketRepository;
import com.smartcampus.repository.UserRepository;
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

    private final NotificationService notificationService;

    private final UserRepository userRepository;

    @Value("${app.upload.dir:uploads/tickets}")
    private String uploadDir;

    public IncidentTicketService(
            IncidentTicketRepository incidentTicketRepository,
            MongoTemplate mongoTemplate,
            NotificationService notificationService,
            UserRepository userRepository
    ) {
        this.incidentTicketRepository = incidentTicketRepository;
        this.mongoTemplate = mongoTemplate;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    // Create incident ticket with attachments and optional resource linking (validates and sets resourceId)
    public IncidentTicket createWithAttachments(
            String resourceIdRaw,
            String subjectRaw,
            String location,
            String createdByUserIdRaw,
            String createdByUserNameRaw,
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
        String subject = blankToNull(subjectRaw);
        if (email == null && phone == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide at least an email or a phone number");
        }
        if (subject == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subject is required");
        }
        if (subject.length() > 160) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subject must be at most 160 characters");
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
        ticket.setSubject(subject);
        ticket.setLocation(loc);
        ticket.setCreatedByUserId(blankToNull(createdByUserIdRaw));
        ticket.setCreatedByUserName(blankToNull(createdByUserNameRaw));
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
            Path dir = resolveUploadBaseDir().resolve(ticketId).normalize();
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
        IncidentTicket persisted = incidentTicketRepository.save(saved);

        if (persisted.getCreatedByUserId() != null) {
            notificationService.createNotification(
                    persisted.getCreatedByUserId(),
                    "Ticket submitted",
                    "Your ticket " + persisted.getTicketNumber() + " has been submitted.",
                    "TICKET_CREATED",
                    "TICKET",
                    persisted.getId(),
                    persisted.getCreatedByUserId(),
                    ticketMetadata(persisted)
            );
        }

        return persisted;
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
        Instant now = Instant.now();
        if (ticket.getFirstResponseAt() == null && status != IncidentTicket.Status.OPEN) {
            ticket.setFirstResponseAt(now);
        }
        if (status == IncidentTicket.Status.RESOLVED || status == IncidentTicket.Status.CLOSED) {
            if (ticket.getResolvedAt() == null) {
                ticket.setResolvedAt(now);
            }
        }
        IncidentTicket saved = incidentTicketRepository.save(ticket);

        if (saved.getCreatedByUserId() != null) {
            String message = "Your ticket " + saved.getTicketNumber() + " status changed to " + saved.getStatus() + ".";
            if (saved.getStatus() == IncidentTicket.Status.REJECTED && rejectReason != null) {
                message += " Reason: " + rejectReason;
            }
            notificationService.createNotification(
                    saved.getCreatedByUserId(),
                    "Ticket status updated",
                    message,
                    "TICKET_STATUS",
                    "TICKET",
                    saved.getId(),
                    null,
                    ticketMetadata(saved)
            );
        }

        return saved;
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
        IncidentTicket saved = incidentTicketRepository.save(ticket);

        User assignee = resolveAssignee(assigned);
        if (assignee != null) {
            notificationService.createNotification(
                    assignee.getId(),
                    "Ticket assigned to you",
                    "Ticket " + saved.getTicketNumber() + " was assigned to you.",
                    "TICKET_ASSIGNED",
                    "TICKET",
                    saved.getId(),
                    null,
                    ticketMetadata(saved)
            );
        }

        if (saved.getCreatedByUserId() != null && (assignee == null || !saved.getCreatedByUserId().equals(assignee.getId()))) {
            notificationService.createNotification(
                    saved.getCreatedByUserId(),
                    "Ticket assigned",
                    "Your ticket " + saved.getTicketNumber() + " has been assigned to " + (assigned == null ? "a technician" : assigned) + ".",
                    "TICKET_ASSIGNED",
                    "TICKET",
                    saved.getId(),
                    null,
                    ticketMetadata(saved)
            );
        }

        return saved;
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
        IncidentTicket saved = incidentTicketRepository.save(ticket);
        notifyCommentParticipants(saved, ownerId, author, body);
        return saved;
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

    private void notifyCommentParticipants(IncidentTicket ticket, String actorId, String author, String body) {
        if (ticket.getCreatedByUserId() != null && !ticket.getCreatedByUserId().equals(actorId)) {
            notificationService.createNotification(
                    ticket.getCreatedByUserId(),
                    "New ticket comment",
                    (author == null ? "A staff member" : author) + " commented on ticket " + ticket.getTicketNumber() + ".",
                    "TICKET_COMMENT",
                    "TICKET",
                    ticket.getId(),
                    actorId,
                    commentMetadata(ticket, body)
            );
        }

        User assignee = resolveAssignee(ticket.getAssignedTo());
        if (assignee != null && !assignee.getId().equals(actorId) && !assignee.getId().equals(ticket.getCreatedByUserId())) {
            notificationService.createNotification(
                    assignee.getId(),
                    "New comment on assigned ticket",
                    (author == null ? "Someone" : author) + " commented on ticket " + ticket.getTicketNumber() + ".",
                    "TICKET_COMMENT",
                    "TICKET",
                    ticket.getId(),
                    actorId,
                    commentMetadata(ticket, body)
            );
        }
    }

    private User resolveAssignee(String assignedToRaw) {
        String assignedTo = blankToNull(assignedToRaw);
        if (assignedTo == null) {
            return null;
        }

        for (User user : userRepository.findAll()) {
            if (!user.isActive() || user.getRoles() == null) {
                continue;
            }

            boolean staff = user.getRoles().stream().anyMatch(role ->
                    role == com.smartcampus.model.Role.ROLE_TECHNICIAN
                            || role == com.smartcampus.model.Role.ROLE_ADMIN
                            || role == com.smartcampus.model.Role.ROLE_SYSTEM_ADMIN
            );
            if (!staff) {
                continue;
            }

            String name = blankToNull(user.getName());
            String email = blankToNull(user.getEmail());
            String id = blankToNull(user.getId());
            String label = name != null && email != null ? name + " (" + email + ")" : name != null ? name : email != null ? email : id;

            if (assignedTo.equalsIgnoreCase(id)
                    || assignedTo.equalsIgnoreCase(email)
                    || assignedTo.equalsIgnoreCase(name)
                    || assignedTo.equalsIgnoreCase(label)
                    || (email != null && assignedTo.toLowerCase().contains(email.toLowerCase()))
                    || (name != null && assignedTo.toLowerCase().contains(name.toLowerCase()))) {
                return user;
            }
        }

        return null;
    }

    private java.util.Map<String, Object> ticketMetadata(IncidentTicket ticket) {
        java.util.Map<String, Object> metadata = new java.util.LinkedHashMap<>();
        metadata.put("ticketNumber", ticket.getTicketNumber());
        metadata.put("status", ticket.getStatus() != null ? ticket.getStatus().name() : "");
        metadata.put("priority", ticket.getPriority() != null ? ticket.getPriority().name() : "");
        if (ticket.getAssignedTo() != null) {
            metadata.put("assignedTo", ticket.getAssignedTo());
        }
        return metadata;
    }

    private java.util.Map<String, Object> commentMetadata(IncidentTicket ticket, String body) {
        java.util.Map<String, Object> metadata = ticketMetadata(ticket);
        metadata.put("excerpt", body.length() > 120 ? body.substring(0, 120) + "..." : body);
        return metadata;
    }

    public void deleteById(String ticketId) {
        String id = blankToNull(ticketId);
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ticket id is required");
        }
        if (!incidentTicketRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found");
        }
        Path base = resolveUploadBaseDir();
        Path ticketDir = base.resolve(id).normalize();
        if (!ticketDir.startsWith(base)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid ticket id");
        }
        deleteUploadDirectoryIfPresent(ticketDir);
        incidentTicketRepository.deleteById(id);
    }

    public Path resolveAttachmentPath(String ticketIdRaw, String filenameRaw) {
        String ticketId = blankToNull(ticketIdRaw);
        String filename = blankToNull(filenameRaw);
        if (ticketId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ticket id is required");
        }
        if (filename == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Filename is required");
        }

        Path base = resolveUploadBaseDir();
        Path ticketDir = base.resolve(ticketId).normalize();
        if (!ticketDir.startsWith(base)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid ticket id");
        }

        Path file = ticketDir.resolve(sanitizeFilename(filename)).normalize();
        if (!file.startsWith(ticketDir) || !Files.exists(file) || !Files.isRegularFile(file)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found");
        }
        return file;
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

    private Path resolveUploadBaseDir() {
        List<Path> candidates = List.of(
                Paths.get(uploadDir),
                Paths.get("backend").resolve(uploadDir),
                Paths.get("..").resolve(uploadDir),
                Paths.get("..").resolve("backend").resolve(uploadDir)
        );

        for (Path candidate : candidates) {
            Path absolute = candidate.normalize().toAbsolutePath();
            if (Files.exists(absolute)) {
                return absolute;
            }
        }

        return Paths.get(uploadDir).normalize().toAbsolutePath();
    }

    private static class TicketCounter {
        @Id
        private String id;
        private long seq;
    }
}
