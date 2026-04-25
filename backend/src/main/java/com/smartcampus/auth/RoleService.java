package com.smartcampus.auth;

import com.smartcampus.model.Role;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class RoleService {

    // Email to role mapping configuration
    private static final Map<String, Role> EMAIL_ROLE_MAPPING = new HashMap<>();

    static {
        EMAIL_ROLE_MAPPING.put("buddhimasankalapa@gmai.com", Role.ROLE_USER);
        EMAIL_ROLE_MAPPING.put("buddhimasankalapa@gmail.com", Role.ROLE_USER);
        EMAIL_ROLE_MAPPING.put("janithsgunasekara003@gmail.com", Role.ROLE_ADMIN);
        EMAIL_ROLE_MAPPING.put("tiranrawishan@gmail.com", Role.ROLE_SYSTEM_ADMIN);
        EMAIL_ROLE_MAPPING.put("induthathsarani@gmail.com", Role.ROLE_TECHNICIAN);
    }

    /**
     * Get the assigned role for an email address
     * Returns ROLE_USER as default for new users not in the mapping
     */
    public Role getRoleForEmail(String email) {
        if (email == null) {
            return Role.ROLE_USER;
        }
        return EMAIL_ROLE_MAPPING.getOrDefault(normalizeEmail(email), Role.ROLE_USER);
    }

    /**
     * Check if an email has SYSTEM_ADMIN role
     */
    public boolean isSystemAdmin(String email) {
        return getRoleForEmail(email) == Role.ROLE_SYSTEM_ADMIN;
    }

    /**
     * Get all configured email-role mappings (for admin purposes)
     */
    public Map<String, Role> getAllEmailRoleMappings() {
        return new HashMap<>(EMAIL_ROLE_MAPPING);
    }

    /**
     * Update role mapping for an email (only for SYSTEM_ADMIN)
     */
    public void updateEmailRoleMapping(String email, Role role) {
        if (email != null && role != null) {
            EMAIL_ROLE_MAPPING.put(normalizeEmail(email), role);
        }
    }

    public String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
