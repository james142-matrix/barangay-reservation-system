# System Flow (Flow-to-Flow)

This document explains the actual business flow from login to completion.

## 1. Authentication Flow

1. User opens `index.php`.
2. `js/login.js` submits credentials to `POST /auth/login`.
3. API checks username, password hash, and role.
4. API allows only `admin` or `barangay_staff`.
5. API stores user details in PHP session.
6. Frontend redirects user to role dashboard.

Output:
- Active authenticated session
- Role-based dashboard access

## 2. Session Validation Flow

1. Protected pages call `checkAuth()` from `js/auth.js`.
2. `checkAuth()` calls `GET /auth/me`.
3. If session is invalid, user is redirected to login.
4. If role is wrong for page, user is redirected to allowed dashboard.

Output:
- Unauthorized access is blocked early.

## 3. Reservation Creation Flow

1. Staff/admin opens `reserve.php`.
2. Frontend loads facilities from `GET /facilities`.
3. User enters booking and client details.
4. Frontend validates fields (date/time/contact/capacity/cost).
5. Frontend sends `POST /reservations`.
6. API checks schedule overlap against active records.
7. API saves reservation as:
- `status = pending`
- `payment_status = pending`

Output:
- New pending reservation record

## 4. Request Review Flow

1. Reviewer opens role request page.
2. Page loads reservations and related details.
3. Reviewer selects reservation and decides action.
4. Approve path updates reservation review metadata.
5. Reject path requires reason and saves rejection details.
6. Frontend creates notification record for affected user.

Output:
- Reservation becomes `approved` or `rejected`

## 5. Billing Confirmation Flow

1. Reviewer opens billing page.
2. Page lists records with payment status.
3. Reviewer finds approved and unpaid reservations.
4. After receiving onsite cash, reviewer clicks `Confirm Cash`.
5. Frontend/API update reservation fields:
- `paymentStatus = cash`
- `paymentMethod = onsite_cash`
- `paymentDate = timestamp`
- `status = completed`
6. Notification is created for payment confirmation.

Output:
- Reservation is marked completed with cash payment info

## 6. Facility Management Flow

1. Staff/admin opens facilities page.
2. CRUD actions call `/facilities` endpoints.
3. Archive action marks facility as archived (soft delete).

Output:
- Facility list stays current without hard-delete data loss

## 7. User Management Flow (Admin)

1. Admin opens `admin-users.php`.
2. User list loads via `GET /users`.
3. Admin creates user via `POST /users`.
4. Admin edits user via `PUT /users/:id`.
5. Admin archives user via `DELETE /users/:id` (soft delete).

Output:
- User accounts are controlled centrally by admin

## 8. Forgot Password Flow

1. User opens `forgot-password.php`.
2. Email is checked (`POST /users/forgot-password/check-email`).
3. Reset code is requested (`POST /users/forgot-password/request`).
4. API stores hashed code with 10-minute expiry.
5. Email with code is sent (SMTP or Gmail API mode).
6. User submits code + new password (`POST /users/forgot-password/reset`).
7. API verifies code, updates password hash, and marks code used.

Output:
- User can recover account securely

## 9. Notification Flow

1. Business events create records with `POST /notifications`.
2. User list is read with `GET /notifications?user=...`.
3. Read status is updated with `PUT /notifications/:id/read`.

Output:
- Users can track important request and billing updates

## 10. Data Persistence Flow

1. API writes operational records to MySQL tables.
2. Archived data stays in DB with archive flags.
3. Dashboards and reports read status fields to compute metrics.

Output:
- End-to-end history is preserved for reporting and audit

Last updated: 2026-03-07
