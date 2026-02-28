# Barangay Reservation System

A role-based facility reservation system for residents, barangay staff, and administrators.

## Overview

The project supports two runtime modes:
- Offline mode: works with browser localStorage only.
- Online mode: uses the Node.js API and MySQL, with local fallback where implemented.

## Main Features

- Authentication
  - Username/password login
  - Signup with email verification flow
  - Forgot-password flow with OTP/captcha support
  - Role-based access for `resident`, `barangay_staff`, and `admin`
- Resident workflows
  - Browse facilities
  - Create reservations
  - Track reservation status
  - Pay approved reservations from billing page
- Staff/Admin workflows
  - Review and process reservation requests
  - Manage facilities
  - Track billing and mark payments
  - View reports and analytics
  - Manage users (admin)
- Notifications
  - In-app notifications and unread counters

## Current Pages

### Public
- `index.html`
- `signup.html`
- `forgot-password.html`

### Resident
- `resident-dashboard.html`
- `facilities.html`
- `reserve.html`
- `my-reservations.html`
- `billing.html`

### Barangay Staff
- `barangay-staff-dashboard.html`
- `barangay-staff-requests.html`
- `barangay-staff-facilities.html`
- `barangay-staff-billing.html`

### Admin
- `admin-dashboard.html`
- `admin-requests.html`
- `admin-facilities.html`
- `admin-billing.html`
- `admin-users.html`
- `reports.html`

## Local Run

1. Open `index.html` directly in a browser for offline mode.
2. Use demo credentials shown on the login screen, or create a resident account.

## Online Run (API + MySQL)

1. Import `database.sql` into MySQL.
2. Configure DB and environment variables in the server runtime.
3. Start the API:

```bash
cd server
npm install
node index.js
```

4. Open `index.html` in browser.

## Documentation Index

- `QUICKSTART.md`: fast setup
- `HOW-TO-USE.md`: user workflows
- `ARCHITECTURE.md`: system structure and data flow
- `DEPLOYMENT.md`: deployment notes
- `server/API.md`: backend endpoint reference
- `VERIFICATION.md`: QA checklist
- `COMPLETION.md`: completion snapshot
- `TODO.md`: recent fix log

## Notes

- Offline data is stored in localStorage and can be cleared by browser cleanup.
- For production, use HTTPS, strong secret management, and hashed credentials only.

Last updated: 2026-02-28
