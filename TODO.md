# TODO / Change Log

## Resolved

- Fixed signup persistence path so user creation no longer races.
- Fixed login verification mismatch by using proper password verification logic.
- Updated login fallback handling to avoid plaintext-comparison behavior.
- Added/validated backend auth and user routes needed for online mode.
- Normalized all project Markdown docs for consistency and accuracy.

## Next

- Add automated regression tests for signup/login/reset.
- Add API contract tests for reservations and billing flows.
- Add markdown linting in CI to prevent doc drift.

Last updated: 2026-02-28
