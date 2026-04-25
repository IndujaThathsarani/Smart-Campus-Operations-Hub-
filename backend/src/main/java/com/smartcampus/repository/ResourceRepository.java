package com.smartcampus.repository;

import com.smartcampus.model.Resource;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface ResourceRepository extends MongoRepository<Resource, String> {
	Optional<Resource> findByNameIgnoreCase(String name);
}
