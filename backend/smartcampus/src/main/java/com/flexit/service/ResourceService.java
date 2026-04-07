package com.flexit.service;

import com.flexit.exception.ResourceNotFoundException;
import com.flexit.model.Resource;
import com.flexit.model.ResourceType;
import com.flexit.repository.ResourceRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ResourceService {

    private final ResourceRepository resourceRepository;

    public ResourceService(ResourceRepository resourceRepository) {
        this.resourceRepository = resourceRepository;
    }

    public Resource createResource(Resource resource) {
        return resourceRepository.save(resource);
    }

    public List<Resource> getAllResources() {
        return resourceRepository.findAll();
    }

    public Resource getResourceById(String id) {
        return resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));
    }

    public Resource updateResource(String id, Resource updatedResource) {
        Resource existing = getResourceById(id);

        existing.setName(updatedResource.getName());
        existing.setType(updatedResource.getType());
        existing.setCapacity(updatedResource.getCapacity());
        existing.setLocation(updatedResource.getLocation());
        existing.setAvailabilityStart(updatedResource.getAvailabilityStart());
        existing.setAvailabilityEnd(updatedResource.getAvailabilityEnd());
        existing.setStatus(updatedResource.getStatus());
        existing.setDescription(updatedResource.getDescription());

        return resourceRepository.save(existing);
    }

    public void deleteResource(String id) {
        Resource existing = getResourceById(id);
        resourceRepository.delete(existing);
    }

    public List<Resource> searchResources(String type, Integer capacity, String location) {
        List<Resource> resources = resourceRepository.findAll();

        return resources.stream()
                .filter(resource -> type == null || resource.getType().name().equalsIgnoreCase(type))
                .filter(resource -> capacity == null || resource.getCapacity() >= capacity)
                .filter(resource -> location == null || resource.getLocation().toLowerCase().contains(location.toLowerCase()))
                .collect(Collectors.toList());
    }
}

