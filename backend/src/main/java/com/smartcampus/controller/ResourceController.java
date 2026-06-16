package com.smartcampus.controller;

import com.smartcampus.model.Resource;
import com.smartcampus.service.ResourceReportPdfService;
import com.smartcampus.service.ResourceService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/resources")
@CrossOrigin(origins = "http://localhost:5173")
public class ResourceController {

    private final ResourceService resourceService;
    private final ResourceReportPdfService resourceReportPdfService;

    public ResourceController(ResourceService resourceService, ResourceReportPdfService resourceReportPdfService) {
        this.resourceService = resourceService;
        this.resourceReportPdfService = resourceReportPdfService;
    }

    /**
     * Get all resources or search by filters
     * Used by frontend to populate resource dropdown in incident ticket forms
     */
    @GetMapping
    public ResponseEntity<List<Resource>> getResources(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Integer capacity,
            @RequestParam(required = false) String location) {
        
        List<Resource> resources;
        
        if (type != null || capacity != null || location != null) {
            resources = resourceService.searchResources(type, capacity, location);
        } else {
            resources = resourceService.getAllResources();
        }
        
        return ResponseEntity.ok(resources);
    }

    /**
     * Get resource by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Resource> getResourceById(@PathVariable String id) {
        Resource resource = resourceService.getResourceById(id);
        return ResponseEntity.ok(resource);
    }

    /**
     * Create new resource
     */
    @PostMapping
    public ResponseEntity<?> createResource(@RequestBody Resource resource) {
        try {
            Resource created = resourceService.createResource(resource);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Resource created successfully");
            response.put("data", created);
            response.put("id", created.getId());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "CREATION_FAILED");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    @GetMapping(value = "/report", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<?> downloadResourceManagementReport() {
        try {
            byte[] reportBytes = resourceReportPdfService.generateResourceManagementReport();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDisposition(ContentDisposition.attachment()
                    .filename("resource-management-report-" + LocalDate.now() + ".pdf")
                    .build());

            return new ResponseEntity<>(reportBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "REPORT_GENERATION_FAILED");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Update existing resource
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateResource(@PathVariable String id, @RequestBody Resource resource) {
        try {
            Resource updated = resourceService.updateResource(id, resource);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Resource updated successfully");
            response.put("data", updated);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "UPDATE_FAILED");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * Delete resource by ID
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteResource(@PathVariable String id) {
        try {
            resourceService.deleteResource(id);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Resource deleted successfully");
            response.put("id", id);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "DELETE_FAILED");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }
}