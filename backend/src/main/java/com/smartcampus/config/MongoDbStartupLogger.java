package com.smartcampus.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * Logs the active MongoDB database name so you can confirm Atlas vs localhost.
 */
@Component
@Order(0)
public class MongoDbStartupLogger implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(MongoDbStartupLogger.class);

    private final MongoTemplate mongoTemplate;

    public MongoDbStartupLogger(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void run(String... args) {
        String name = mongoTemplate.getDb().getName();
        log.info(
                "MongoDB active database: [{}]. For Atlas, expect SmartCampus; if you see 'test' or localhost in driver logs, set SPRING_MONGODB_URI (Spring Boot 4) or SPRING_DATA_MONGODB_URI (legacy) and restart.",
                name);
    }
}
