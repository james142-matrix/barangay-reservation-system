# System Flow (Flow-to-Flow)

This file explains the end-to-end operational flow of the system.

## 1. Authentication Flow

1. User opens `index.php`.
2. `js/login.js` sends credentials to `POST /auth/login`.
3. API validates user and password from `users` table.
4. API blocks `resident` role login and allows only `admin`/`barangay_staff`.
5. API stores user in PHP session and returns user info.
6. Frontend redirects to role dashboard.

## 2. Session Validation Flow

1. Protected pages call `checkAuth()` from `js/auth.js`.
2. `checkAuth()` synchronously calls `GET /auth/me`.
3. If session is missing/invalid, user is redirected to login.
4. If role does not match page requirement, user is redirected to their allowed dashboard.

## 3. Reservation Creation Flow

1. Staff/admin opens `reserve.php`.
2. Page loads facilities via `GET /facilities`.
3. User enters event details and client/resident info.
4. Frontend validates dates, time, contact fields, capacity, and cost.
5. Frontend posts to `POST /reservations`.
6. API validates schedule overlap against pending/approved reservations.
7. API inserts reservation with `status = pending` and `payment_status = pending`.

## 4. Request Review Flow

1. Staff/admin opens `*-requests.php`.
2. Page loads reservations, users, and facilities.
3. Reviewer opens a reservation and chooses approve/reject.
4. Approve path updates reservation via `PUT /reservations/:id` with approver info.
5. Reject path updates reservation with rejection reason and metadata.
6. Frontend creates notification entry for the affected client username.

## 5. Billing Flow

1. Staff/admin opens `*-billing.php`.
2. Page lists reservations with billing statuses.
3. For approved unpaid records, reviewer clicks `Confirm Cash`.
4. Frontend updates reservation:
   - `paymentStatus = cash`
   - `paymentMethod = onsite_cash`
   - `paymentDate = timestamp`
   - `status = completed`
5. Frontend creates payment confirmation notification.

## 6. Facility Management Flow

1. Staff/admin opens facilities management page.
2. CRUD actions call `/facilities` API.
3. Delete action performs soft-archive (`archived = 1`).

## 7. User Management Flow (Admin)

1. Admin opens `admin-users.php`.
2. User list loads from `GET /users`.
3. Create user uses `POST /users` (allowed roles: admin/staff only).
4. Edit user uses `PUT /users/:id`.
5. Archive user uses `DELETE /users/:id` (soft-archive).

## 8. Forgot Password Flow

1. User opens `forgot-password.php`.
2. Step 1 checks email with `POST /users/forgot-password/check-email`.
3. Step 2 requests code via `POST /users/forgot-password/request`.
4. API stores hashed code with 10-minute expiry and sends SMTP email.
5. User submits code + new password to `POST /users/forgot-password/reset`.
6. API verifies code, updates password hash, and marks code used.

## 9. Notification Flow

1. Business actions create notifications through `POST /notifications`.
2. User-specific list loads with `GET /notifications?user=...`.
3. Read action updates with `PUT /notifications/:id/read`.

## 10. Data Persistence Flow

1. API reads/writes MySQL tables.
2. Soft deletes are handled with `archived` flags.
3. Reservation and billing statuses drive dashboard/report metrics.

Last updated: 2026-03-03
