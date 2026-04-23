package com.smartcampus.service;

import com.smartcampus.model.Notification;
import com.smartcampus.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    public Notification createNotification(String userId, String title, String message, String type, String bookingId) {
        Notification notification = new Notification(userId, title, message, type, bookingId);
        return notificationRepository.save(notification);
    }

    public List<Notification> getUserNotifications(String userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Notification markAsRead(String notificationId, String userId) {
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (!notification.getUserId().equals(userId)) {
            throw new IllegalStateException("Notification does not belong to the current user");
        }

        notification.setRead(true);
        return notificationRepository.save(notification);
    }
}
