# Full-Stack Explanation

This document explains how the current PHP stack works from browser to database.

## 1. Stack Summary

- UI pages: root `*.php`
- Frontend scripts: `js/*.js`
- API: `api/index.php`
- DB: MySQL (`database.sql`)
- Auth: PHP session cookie

## 2. Frontend Runtime

`js/api.js` is the central API client.
- Base URL defaults to `/barangay-reservation-system/api`
- Every request uses `credentials: 'include'`
- Handles JSON error payloads and surfaces `error` message

`js/auth.js` handles page access.
- Sync call to `/auth/me` to get active session user
- Redirects unauthenticated users to `index.php`
- Enforces role-specific page access (`admin` / `barangay_staff`)

## 3. Backend Request Routing

`api/index.php`:
1. Loads config and starts session.
2. Loads DB and helper functions.
3. Sets CORS/credentials headers.
4. Routes by method + path.
5. Returns JSON for all API responses.

## 4. Auth and Access Control

Login endpoint:
- `POST /auth/login`
- Checks `users` table + password hash
- Blocks `resident` role from logging in
- Stores sanitized user data in `$_SESSION['user']`

Session endpoints:
- `GET /auth/me`
- `POST /auth/logout`

Role checks:
- `require_auth()` for signed-in access
- `require_role([...])` for per-feature restrictions

## 5. Reservation Lifecycle

Create:
- `POST /reservations`
- Validates required fields, contact fields, guests vs capacity
- Validates time range and overlap conflicts
- Stores `status = pending`, `payment_status = pending`

Review:
- `PUT /reservations/:id`
- Staff/admin set approval or rejection fields
- Notification entries are created by frontend flow

Billing:
- Billing screens list approved unpaid reservations
- Cash confirmation updates reservation with:
  - `paymentStatus = cash`
  - `paymentMethod = onsite_cash`
  - `paymentDate = now`
  - `status = completed`

## 6. User and Facility Management

Users (`admin` only for write):
- Create/update/archive in `admin-users.php`
- API only allows `admin` and `barangay_staff` roles

Facilities (`admin` and `barangay_staff` write in current API):
- CRUD via `/facilities`
- Soft-archive on delete

## 7. Forgot Password

Endpoints:
- `POST /users/forgot-password/check-email`
- `POST /users/forgot-password/request`
- `POST /users/forgot-password/reset`

Behavior:
- Generates 6-digit code
- Stores only hashed code (`password_reset_codes`)
- Expires in 10 minutes
- Sends code through SMTP from `api/config.php`

## 8. Data Model

Main tables:
- `users`
- `facilities`
- `reservations`
- `billing_transactions`
- `notifications`
- `password_reset_codes`

The API also runs lightweight compatibility checks at startup for optional columns.

Last updated: 2026-03-03
