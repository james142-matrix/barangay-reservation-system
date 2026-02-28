# Backend API Documentation

Base URL: `http://localhost:3000`

## Auth and Session

- `POST /auth/login`
- `POST /users/login` (alias path)
- `POST /auth/google`
- `POST /auth/change-password-required`
- `GET /auth/me`
- `POST /auth/logout`

## Email Verification and Password Recovery

- `POST /verification-codes`
- `POST /verification-codes/verify`
- `POST /users/forgot-password/check-email`
- `POST /users/forgot-password/request`
- `POST /users/forgot-password/reset`
- `POST /users/forgot-password/firebase-reset`

## Users

- `POST /users` (registration)
- `GET /users` (staff/admin role guarded)
- `PUT /users/:id` (admin role guarded)
- `DELETE /users/:id` (admin role guarded)

## Facilities

- `GET /facilities`
- `POST /facilities` (admin)
- `PUT /facilities/:id` (admin)
- `DELETE /facilities/:id` (admin)

## Reservations

- `POST /reservations`
- `GET /reservations`
- `PUT /reservations/:id`
- `DELETE /reservations/:id`

## Notifications

- `GET /notifications`
- `POST /notifications`
- `PUT /notifications/:id/read`

## Authorization Model

Server routes use token auth and role guards.

Roles used in the system:
- `resident`
- `barangay_staff`
- `admin`

Typical guard behavior:
- Resident routes: resident, staff, admin (as configured per route)
- Management routes: staff/admin or admin only

## Response Format

- Success: JSON payload per route
- Error: JSON with `error` field (some legacy plain text responses may still exist)

## Local Start

```bash
cd server
npm install
node index.js
```

Last updated: 2026-02-28
