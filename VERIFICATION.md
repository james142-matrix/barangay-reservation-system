# Verification Checklist

Use this checklist for quick QA before demo or release.

## Documentation

- [x] `README.md` matches current page and script structure
- [x] `QUICKSTART.md` reflects offline and online run paths
- [x] `HOW-TO-USE.md` reflects resident/staff/admin workflows
- [x] `ARCHITECTURE.md` reflects current frontend/backend split
- [x] `DEPLOYMENT.md` contains current rollout and security notes
- [x] `server/API.md` reflects active route families
- [x] `TODO.md` and `COMPLETION.md` are consistent

## Application Smoke Tests

- [ ] Login works for resident, staff, admin
- [ ] Signup creates a resident account
- [ ] Forgot-password flow resets credentials
- [ ] Resident can create reservation
- [ ] Staff/admin can approve or reject
- [ ] Billing state updates after payment action
- [ ] Notifications update after status changes
- [ ] Reports page loads with expected metrics

## API Smoke Tests

- [ ] `/auth/login` accepts valid credentials
- [ ] `/facilities` returns list for authorized users
- [ ] `/reservations` create/read/update paths work
- [ ] `/notifications` endpoints work for authorized users
- [ ] `/users` admin/staff access controls behave correctly

Last updated: 2026-02-28
