# Architecture

## System Layers

1. Presentation layer
- PHP pages in project root (`*.php`)
- Shared styles in `css/style.css`
- Page controllers in `js/*.js`

2. Application layer
- API client wrapper: `js/api.js`
- Auth/session guard: `js/auth.js`
- PHP REST API: `api/index.php`

3. Data layer
- MySQL schema: `database.sql`
- Runtime DB connection: `api/db.php`

## Auth Model

- Authentication uses PHP sessions.
- Login endpoint stores user in `$_SESSION['user']`.
- Frontend sends cookies using `credentials: 'include'`.
- Guard helpers:
  - `require_auth()`
  - `require_role([...])`

## API Domains

- Auth: `/auth/*`
- Users: `/users*`
- Facilities: `/facilities*`
- Reservations: `/reservations*`
- Notifications: `/notifications*`
- Forgot password: `/users/forgot-password/*`

## Core Data Tables

- `users`
- `facilities`
- `reservations`
- `billing_transactions`
- `notifications`
- `password_reset_codes`

## Operational Rules

- Active login access is staff/admin only.
- Reservation conflict checks run server-side before insert.
- Soft-archive is used for users/facilities/reservations.
- Billing flow is onsite-cash confirmation by staff/admin.

Last updated: 2026-03-03
