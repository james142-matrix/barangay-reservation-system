# Verification Checklist

Use this before demo, handoff, or release.

## 1. Documentation

- [ ] `README.md` matches the current PHP/MySQL app
- [ ] `QUICKSTART.md` works on a clean XAMPP setup
- [ ] `HOW-TO-USE.md` matches actual admin/staff workflows
- [ ] `ARCHITECTURE.md` matches session, CSRF, and API behavior
- [ ] `SYSTEM-FLOW.md` matches current reservation/billing flow
- [ ] `DEPLOYMENT.md` matches real deployment steps
- [ ] `SIA-PROJECT-DOCUMENTATION.md` matches the current project scope
- [ ] `mobile_app/README.md` matches the actual mobile project state

## 2. Setup

- [ ] `.env` exists
- [ ] database imports cleanly from `database.sql`
- [ ] mail settings are valid if password reset is required
- [ ] logs directory is writable

## 3. Authentication

- [ ] `admin` login works
- [ ] `barangay_staff` login works
- [ ] pending signup cannot log in
- [ ] blocked role cannot log in
- [ ] logout works
- [ ] session expiry behavior is acceptable
- [ ] repeated bad logins trigger rate limiting

## 4. Reservation Flow

- [ ] reservation form loads facilities
- [ ] overlap detection works
- [ ] capacity validation works
- [ ] facility rule validation works
- [ ] medical room detail requirement works
- [ ] down-payment option works
- [ ] add-on totals behave correctly
- [ ] request appears in requests page after save

## 5. Request Review

- [ ] admin requests page loads
- [ ] staff requests page loads
- [ ] pending unpaid reservation can still be edited
- [ ] edited reservation re-validates schedule/rules
- [ ] billed reservation becomes view-only

## 6. Billing

- [ ] billing list loads
- [ ] down payment collection works
- [ ] remaining balance collection works
- [ ] full payment marks reservation completed
- [ ] unpaid pending reservation can be cancelled
- [ ] payment notification is created
- [ ] receipt email sends when mail is configured

## 7. Admin Operations

- [ ] create user works
- [ ] approve signup works
- [ ] decline/archive user works
- [ ] protected admin checks work
- [ ] create facility works
- [ ] edit facility works
- [ ] archive facility works
- [ ] archive center loads
- [ ] restore archived user works
- [ ] restore archived facility works

## 8. Reports

- [ ] reports page loads without JS/API errors
- [ ] CSV export works
- [ ] print/PDF export works
- [ ] totals look correct for current data
- [ ] legacy "In Billing" labels are understood/accepted for demo

## 9. Password Recovery

- [ ] check-email endpoint works
- [ ] reset code request works
- [ ] code expiry works
- [ ] password reset works end to end

## 10. Mobile Project

- [ ] mobile README matches current state
- [ ] team understands `mobile_app/lib/main.dart` is still not wired to the real app shell

Last updated: 2026-03-15
