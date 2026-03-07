# Architecture

This document explains how the system is organized and how data moves between layers.

## 1. High-Level Structure

The system has 3 main layers:

1. Presentation layer
- Root PHP pages (`*.php`) render screens.
- `css/style.css` provides shared styles.
- `js/*.js` handles page behavior and API calls.

2. Application layer
- `js/api.js` is the frontend API wrapper.
- `js/auth.js` checks session and role access on protected pages.
- `api/index.php` is the main backend API router.

3. Data layer
- MySQL database stores business records.
- `database.sql` defines schema and seed data.
- `api/db.php` handles runtime DB connection.

## 2. Request Lifecycle

Typical flow for any protected action:

1. User opens a PHP page.
2. Frontend script runs and verifies session (`GET /auth/me`).
3. Frontend sends request to API endpoint.
4. API validates auth, role, and input.
5. API reads/writes MySQL.
6. API returns JSON response.
7. Frontend updates UI based on response.

## 3. Authentication Model

- Login endpoint authenticates user credentials.
- Successful login stores sanitized user data in `$_SESSION['user']`.
- Browser includes session cookie on API calls (`credentials: 'include'`).
- Guards used by API:
- `require_auth()` for signed-in users
- `require_role([...])` for role restrictions

## 4. Role and Access Rules

Current login policy:
- Allowed: `admin`, `barangay_staff`
- Blocked: `resident`

Role-based pages and actions are enforced in both frontend checks and backend API guards.

## 5. API Domain Groups

Main route groups:
- `/auth/*`
- `/users*`
- `/facilities*`
- `/reservations*`
- `/notifications*`
- `/users/forgot-password/*`

## 6. Data Model (Core Tables)

- `users`: accounts and role data
- `facilities`: reservable locations/resources
- `reservations`: request records and status
- `billing_transactions`: payment history and billing details
- `notifications`: user-targeted updates
- `password_reset_codes`: hashed reset codes with expiry

## 7. Important Business Rules

- Reservation overlap checks run server-side before insert/update.
- Many delete actions are soft delete (archive flag), not hard delete.
- Billing completion is currently based on onsite cash confirmation.
- Admin manages users; staff/admin manage operational reservation flow.

## 8. Error Handling Approach

- API returns JSON error payloads.
- Frontend wrapper parses response and surfaces meaningful `error` messages.
- Session or role failure redirects user to appropriate page.

Last updated: 2026-03-07
