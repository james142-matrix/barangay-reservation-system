# Fix: Signup not saving to MySQL + Login broken

## Bugs Found
- [x] Bug 1: `signup.js` — `createUser()` called WITHOUT `await` (race condition)
- [x] Bug 2: `auth-service.js` — plain text `===` comparison vs PBKDF2 hash (login always fails)
- [x] Bug 3: `login.js` fallback — same plain text comparison bug
- [x] Bug 4: Server has NO signup/login routes → MySQL never used

## Fix Steps
- [x] Step 1: Update `server/index.js` — add users table init + POST /users + POST /users/login
- [x] Step 2: Update `js/api.js` — add signup() and loginUser() API methods
- [x] Step 3: Update `js/signup.js` — await createUser() + try API first, fallback to localStorage
- [x] Step 4: Update `js/services/auth-service.js` — fix localLogin() to use verifyPassword() + try API first
- [x] Step 5: Update `js/login.js` — fix fallback plain-text comparison to use async verifyPassword()

## ALL FIXES COMPLETE ✅
