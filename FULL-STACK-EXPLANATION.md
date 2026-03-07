# Full-Stack Explanation

This document explains how the application works from browser screen to database write.

## 1. Full Stack at a Glance

- UI pages: root `*.php`
- Frontend logic: `js/*.js`
- API backend: `api/index.php`
- Database: MySQL (`database.sql`)
- Authentication: PHP session cookie

## 2. What Happens When a User Opens a Page

1. Browser loads a PHP page (example: `reserve.php`).
2. Page JavaScript initializes.
3. Auth check runs (`GET /auth/me`) for protected pages.
4. If allowed, page fetches needed data (facilities, reservations, etc.).
5. User actions trigger API calls.

## 3. Frontend Responsibilities

### `js/api.js`

- Central helper for API calls
- Uses base path `/barangay-reservation-system/api`
- Sends credentials (`credentials: 'include'`) on every call
- Parses JSON and throws readable errors

### `js/auth.js`

- Validates active session on load
- Redirects to `index.php` when not logged in
- Redirects to proper dashboard on role mismatch

## 4. Backend Responsibilities (`api/index.php`)

Main steps per request:

1. Load config and start PHP session.
2. Connect to MySQL through DB helper.
3. Apply response headers (JSON, CORS, credentials policy).
4. Parse route by HTTP method + path.
5. Run auth/role/input validation.
6. Run SQL queries.
7. Return JSON success/error response.

## 5. Authentication and Session Control

### Login
- Endpoint: `POST /auth/login`
- Validates credentials against `users`
- Blocks `resident` role
- Stores safe user payload in `$_SESSION['user']`

### Session Endpoints
- `GET /auth/me`: returns current session user
- `POST /auth/logout`: clears session

### Access Guards
- `require_auth()` -> signed-in required
- `require_role([...])` -> role required

## 6. Reservation Lifecycle in Technical Terms

### Create Reservation
- Endpoint: `POST /reservations`
- Validates required fields and values
- Checks schedule overlap for active records
- Saves with:
- `status = pending`
- `payment_status = pending`

### Review Reservation
- Endpoint: `PUT /reservations/:id`
- Approve or reject metadata is stored
- UI creates corresponding notification record

### Confirm Billing
- Triggered from billing pages
- Updates payment fields and completion status
- Final state commonly becomes:
- `paymentStatus = cash`
- `paymentMethod = onsite_cash`
- `status = completed`

## 7. User and Facility Modules

### Users
- Admin page: `admin-users.php`
- API supports create/update/archive
- Allowed operational roles: `admin`, `barangay_staff`

### Facilities
- Managed by staff/admin pages
- CRUD actions use `/facilities`
- Delete is soft archive, not hard delete

## 8. Forgot Password Module

Endpoints:
- `POST /users/forgot-password/check-email`
- `POST /users/forgot-password/request`
- `POST /users/forgot-password/reset`

Security behavior:
- Generates 6-digit code
- Stores hashed code only
- Expires in 10 minutes
- Marks code as used after successful reset

## 9. Database Design Summary

Core operational tables:
- `users`
- `facilities`
- `reservations`
- `billing_transactions`
- `notifications`
- `password_reset_codes`

The API includes startup compatibility checks for optional columns to reduce runtime breakage in mixed environments.

## 10. Why This Design Works for Barangay Workflow

- Session auth is simple for local/server deployment.
- Role controls limit who can perform operational actions.
- Soft delete keeps historical data for reports and audits.
- Clear pending -> approved/rejected -> completed flow matches onsite process.

Last updated: 2026-03-07
