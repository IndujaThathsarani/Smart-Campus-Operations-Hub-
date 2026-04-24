# Role-Based Access Control (RBAC) Implementation

## Role Configuration

The system implements 4 user roles with email-based assignment:

### Configured Roles and Test Accounts

| Email | Role | Password |
|-------|------|----------|
| buddhimasankalapa@gmail.com | USER | campus123 |
| janithsgunasekara003@gmail.com | ADMIN | campus123 |
| tiranrawishan@gmail.com | SYSTEM_ADMIN | campus123 |
| induthathsarani@gmail.com | TECHNICIAN | campus123 |

**Note**: Note the typo in the first email: `buddhimasankalapa@gmai.com` (missing 'l' in gmail) in the original request - use `buddhimasankalapa@gmail.com` for testing.

---

## Authentication Flows

### 1. Manual Email/Password Authentication
- Users sign up with email and password
- Role is automatically assigned based on email (from RoleService mapping)
- New emails not in the mapping get ROLE_USER by default
- Role is synced during login to ensure consistency

### 2. Google OAuth2 Authentication
- Users can authenticate with Google account
- Role is assigned based on email (same RoleService mapping)
- Existing users' roles are kept in sync with email mapping
- Post-login redirect is role-aware (see "Role-Based Navigation" below)

---

## Access Control by Role

### ROLE_USER
**Accessible Pages:**
- Homepage (/) - Available to all
- Resources (/resources) - User catalogue
- Bookings (/bookings) - Create and manage bookings
- Tickets (/tickets) - Create and view tickets
- Notifications (/notifications)

**Navigation Items:**
- HOME, Resources, Bookings, Tickets, Notifications, LOGOUT

---

### ROLE_ADMIN
**Accessible Pages:**
- All ROLE_USER pages
- Admin Catalogue (/admin/catalogue) - Manage resource catalogue
- Admin Tickets (/admin/tickets) - Review and manage all tickets
- Technician Dashboard (/technician/tickets) - Tech ticket view

**Navigation Items:**
- HOME, Resources, Admin Catalogue, Bookings, Tickets, Technician, Admin Tickets, Notifications, LOGOUT

---

### ROLE_TECHNICIAN
**Accessible Pages:**
- All ROLE_USER pages
- Technician Dashboard (/technician/tickets) - View assigned tickets
- Tickets (/tickets) - General tickets view

**Navigation Items:**
- HOME, Resources, Bookings, Tickets, Technician, Notifications, LOGOUT

---

### ROLE_SYSTEM_ADMIN
**Accessible Pages:**
- All pages (full system access)
- System Admin Dashboard (/system-admin/dashboard) - User and role management

**Navigation Items:**
- All navigation items including System Admin dashboard

---

## Backend Implementation

### RoleService
**Location:** `src/main/java/com/smartcampus/auth/RoleService.java`

**Key Methods:**
- `getRoleForEmail(String email)` - Returns role for email (USER default)
- `isSystemAdmin(String email)` - Checks if email is SYSTEM_ADMIN
- `updateEmailRoleMapping(String email, Role role)` - Change role (admin only)

**Email Mapping Configuration:**
```java
EMAIL_ROLE_MAPPING.put("buddhimasankalapa@gmail.com", Role.ROLE_USER);
EMAIL_ROLE_MAPPING.put("janithsgunasekara003@gmail.com", Role.ROLE_ADMIN);
EMAIL_ROLE_MAPPING.put("tiranrawishan@gmail.com", Role.ROLE_SYSTEM_ADMIN);
EMAIL_ROLE_MAPPING.put("induthathsarani@gmail.com", Role.ROLE_TECHNICIAN);
```

### AuthController Changes
**Updated Endpoints:**

1. **POST /api/auth/signup**
   - Assigns role from RoleService based on email
   - New emails get ROLE_USER by default
   - Saves user to MongoDB with assigned role

2. **POST /api/auth/login**
   - Syncs user role with RoleService mapping before returning
   - Ensures role changes are reflected immediately
   - Saves updated user to MongoDB

3. **GET /api/auth/me**
   - Returns current authenticated user with their role
   - Works for both manual and OAuth2 authentication

4. **POST /api/auth/logout**
   - Clears session and SecurityContext

5. **POST /api/auth/change-role** (NEW)
   - **SYSTEM_ADMIN only** - Changes user role
   - Updates email-to-role mapping
   - Updates user in MongoDB
   - Request body:
     ```json
     {
       "targetEmail": "user@example.com",
       "newRole": "ROLE_ADMIN"
     }
     ```

### OAuth2 Integration
- **CustomOAuth2UserService**: Maps OAuth2 principal to User entity
- **OAuth2LoginSuccessHandler**: Redirects to role-based dashboard
- **UserAuthService**: Assigns/syncs roles for Google OAuth2 users

---

## Frontend Implementation

### AuthContext Updates
**Exposed Values:**
- `user` - Current user object
- `roles` - Array of role strings (e.g., ["ROLE_USER"])
- `isAuthenticated` - Boolean
- `logout()` - Logout function
- `hasRole(role)` - Check single role
- `hasAnyRole(allowedRoles)` - Check multiple roles

### Navbar Component
**Role-Based Navigation:**
- Resources - Only for authenticated users
- Admin Catalogue - ADMIN/SYSTEM_ADMIN only
- Bookings - USER/ADMIN/SYSTEM_ADMIN (not TECHNICIAN)
- Tickets - All authenticated users
- Technician - TECHNICIAN/ADMIN/SYSTEM_ADMIN
- Admin Tickets - ADMIN/SYSTEM_ADMIN
- Notifications - All authenticated users
- System Admin - SYSTEM_ADMIN only
- LOGOUT - Authenticated users only

### ProtectedRoute Component
**Usage:**
```jsx
<ProtectedRoute allowedRoles={["ROLE_USER", "ROLE_ADMIN"]}>
  <ComponentName />
</ProtectedRoute>
```

**Behavior:**
- Redirects to /auth if not authenticated
- Redirects to /unauthorized if role not allowed

### App.jsx Routing
**Public Routes:**
- / (HomePage) - Accessible to all
- /auth (AuthPage) - Authentication entry point

**Protected Routes:**
- /resources - ROLE_USER and above
- /admin/catalogue - ADMIN/SYSTEM_ADMIN
- /bookings - USER/ADMIN/SYSTEM_ADMIN
- /tickets - All authenticated
- /tickets/new - USER/ADMIN/SYSTEM_ADMIN
- /technician/tickets - TECHNICIAN/ADMIN/SYSTEM_ADMIN
- /admin/tickets - ADMIN/SYSTEM_ADMIN
- /notifications - All authenticated
- /system-admin/dashboard - SYSTEM_ADMIN only

---

## MongoDB Persistence

### User Document Structure
**Collection:** `users`

**Fields:**
```json
{
  "_id": "ObjectId",
  "name": "User Name",
  "email": "user@example.com",
  "password": "bcrypt_hash",
  "profilePicture": "url_or_null",
  "provider": "MANUAL or GOOGLE",
  "providerId": "google_id_or_null",
  "roles": ["ROLE_USER"],
  "active": true,
  "createdAt": "ISO_8601_timestamp",
  "updatedAt": "ISO_8601_timestamp"
}
```

### Data Persistence Guarantees

1. **On Signup (Manual):**
   - User created with role from RoleService
   - All fields saved to MongoDB
   - Role persisted in `roles` array

2. **On Login (Manual):**
   - User retrieved from MongoDB
   - Role synced with RoleService mapping
   - User updated with current role
   - Updated user saved to MongoDB

3. **On OAuth2 Login:**
   - User found or created in MongoDB
   - Role assigned from RoleService based on email
   - User saved with role

4. **On Role Change (SYSTEM_ADMIN):**
   - RoleService mapping updated in memory
   - Target user retrieved from MongoDB
   - User's roles field updated
   - User saved to MongoDB
   - Changes persist immediately

---

## Testing Guide

### Test Case 1: USER Role Login
**Steps:**
1. Go to Sign In page
2. Enter `buddhimasankalapa@gmail.com` / `campus123`
3. Should redirect to /resources page
4. Navbar should show: HOME, Resources, Bookings, Tickets, Notifications, LOGOUT
5. /admin/catalogue and /technician/tickets should return 403 Unauthorized

**Verify MongoDB:**
- Check `users` collection for entry with `email: "buddhimasankalapa@gmail.com"`
- Verify `roles: ["ROLE_USER"]`
- Verify `provider: "MANUAL"`
- Verify password is bcrypt hash, not plain text

---

### Test Case 2: ADMIN Role Login
**Steps:**
1. Go to Sign In page
2. Enter `janithsgunasekara003@gmail.com` / `campus123`
3. Should redirect to /admin/catalogue page
4. Navbar should show admin options
5. Can access /admin/catalogue and /admin/tickets
6. Cannot access /system-admin/dashboard

**Verify MongoDB:**
- Check for entry with `email: "janithsgunasekara003@gmail.com"`
- Verify `roles: ["ROLE_ADMIN"]`

---

### Test Case 3: TECHNICIAN Role Login
**Steps:**
1. Go to Sign In page
2. Enter `induthathsarani@gmail.com` / `campus123`
3. Should redirect to /technician/tickets page
4. Navbar should show technician options
5. Can access /technician/tickets
6. Cannot access /admin/tickets

**Verify MongoDB:**
- Check for entry with `email: "induthathsarani@gmail.com"`
- Verify `roles: ["ROLE_TECHNICIAN"]`

---

### Test Case 4: SYSTEM_ADMIN Role Login
**Steps:**
1. Go to Sign In page
2. Enter `tiranrawishan@gmail.com` / `campus123`
3. Should redirect to /system-admin/dashboard page
4. Navbar should show all options including System Admin
5. Can access all pages
6. Can use /api/auth/change-role endpoint to modify user roles

**Verify MongoDB:**
- Check for entry with `email: "tiranrawishan@gmail.com"`
- Verify `roles: ["ROLE_SYSTEM_ADMIN"]`

---

### Test Case 5: Google OAuth2 with Role Assignment
**Steps:**
1. Go to Sign In page
2. Click "Sign in with Google"
3. Use Google account matching one of the configured emails
4. Should auto-assign role based on email mapping
5. Should redirect to role-appropriate dashboard

**Verify MongoDB:**
- Check that user created with correct role
- Verify `provider: "GOOGLE"`
- Verify `providerId: "<google_id>"`

---

### Test Case 6: New User Registration
**Steps:**
1. Go to Sign Up page
2. Create account with new email (not in mapping)
3. Should auto-assign ROLE_USER
4. Should be able to access user pages
5. Cannot access admin or technician pages

**Verify MongoDB:**
- Check for new user entry
- Verify `roles: ["ROLE_USER"]` (default)

---

### Test Case 7: SYSTEM_ADMIN Role Change (Optional Future Feature)
**Steps:**
1. As SYSTEM_ADMIN, call POST /api/auth/change-role
2. Body:
   ```json
   {
     "targetEmail": "buddhimasankalapa@gmail.com",
     "newRole": "ROLE_ADMIN"
   }
   ```
3. User should be promoted to ADMIN
4. On next login, user has ADMIN role
5. Can access admin pages

**Verify MongoDB:**
- User document should have updated `roles: ["ROLE_ADMIN"]`
- `updatedAt` timestamp should reflect change

---

## Security Considerations

1. **Password Storage**: All passwords hashed with BCrypt (never stored in plain text)
2. **Role Verification**: Roles verified server-side on every request requiring authentication
3. **SYSTEM_ADMIN Protection**: Only SYSTEM_ADMIN can change user roles
4. **Session Management**: Sessions persist only while user is logged in
5. **OAuth2 Security**: Google OAuth2 flow follows Spring Security best practices

---

## Configuration Files

### Application Properties
**File:** `backend/src/main/resources/application-local.properties`

**MongoDB Connection:**
```properties
spring.data.mongodb.uri=mongodb+srv://induja:1234@cluster0.qckcptz.mongodb.net/SmartCampus?retryWrites=true&w=majority&appName=Cluster0
spring.data.mongodb.database=SmartCampus
spring.data.mongodb.auto-index-creation=true
```

### Environment Variables
**Required for OAuth2:**
- `GOOGLE_CLIENT_ID` - Google OAuth2 client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth2 client secret
- `SPRING_MONGODB_URI` - MongoDB connection string (optional, uses default if not set)

---

## Troubleshooting

### User gets ROLE_USER instead of expected role
- Check email matches exactly (case-insensitive in code)
- Verify email is in RoleService mapping
- Check MongoDB user.roles field

### "403 Forbidden" when accessing role-restricted page
- Normal behavior - user doesn't have required role
- Check role assignment in MongoDB
- Verify ProtectedRoute.allowedRoles matches user's roles

### Role change not reflected after login
- Logout and login again
- Role is synced during login for manual auth
- For OAuth2, clear session and re-authenticate

### MongoDB not persisting roles
- Check connection string in application-local.properties
- Verify MongoDB Atlas cluster is accessible
- Check user document has roles array (not null/undefined)
