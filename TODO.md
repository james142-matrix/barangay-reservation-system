# TODO / Change Log

This file tracks what is done and what should be improved next.

## Recently Completed

- Documentation updated to match current PHP + MySQL architecture.
- Legacy Node/HTML-only notes removed from docs.
- Page and route references aligned with current `*.php` and API endpoints.
- Login policy documented clearly (admin/staff only).
- End-to-end process documented in `SYSTEM-FLOW.md`.
- Markdown files rewritten with clearer, simpler explanations.

## Current Known Gaps

- Public `signup.php` flow may not fully align with current role policy.
- Automated tests are still missing for key business flows.
- DB schema versioning/migrations are not yet formalized.

## Next Priorities

1. Decide final policy for `signup.php`:
- Keep with strict admin approval, or
- Remove/disable if not needed in operations

2. Add automated API tests for:
- Auth
- Reservations
- Billing updates
- Forgot-password

3. Add end-to-end UI smoke tests for:
- Staff workflow
- Admin workflow

4. Introduce migration/version strategy for DB changes:
- Versioned SQL scripts
- Upgrade history tracking

Last updated: 2026-03-07
