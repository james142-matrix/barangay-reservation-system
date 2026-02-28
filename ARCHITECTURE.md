# Architecture

## High-Level Layers

1. Presentation layer
   - HTML pages and CSS UI
   - Page scripts in `js/`
2. Application layer
   - Client API wrapper (`js/api.js`)
   - Auth/session logic (`js/auth.js`)
   - Backend REST API (`server/index.js`)
3. Data layer
   - MySQL (online)
   - localStorage fallback (offline)

## Frontend Structure

- Page-specific controllers: `js/*-dashboard.js`, `js/*-requests.js`, `js/*-facilities.js`, etc.
- Shared behavior:
  - `js/api.js` for HTTP and fallback behavior
  - `js/database.js` for localStorage storage model
  - `js/auth.js` for route/role checks

## Backend Structure

- Entry point: `server/index.js`
- Stack: Express + mysql2 + firebase-admin + nodemailer
- Middleware: auth token checks and role guards for protected routes

## Data Flow (Reservation)

1. User submits reservation form.
2. Frontend validates payload.
3. `js/api.js` sends request to `/reservations`.
4. If API is not reachable, local fallback path may be used.
5. UI refreshes lists, status badges, and notifications.

## Security Baseline

- Role-based access checks in frontend and backend.
- Server-side route guards for protected endpoints.
- Password validation and reset flows.

## Production Notes

- Enforce HTTPS.
- Use strong secrets and rotate credentials.
- Avoid plaintext password handling anywhere.
- Add monitoring, audit logging, and backup policy.

Last updated: 2026-02-28
