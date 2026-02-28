# Deployment

## Environments

- Development/demo: offline localStorage mode.
- Integrated testing: API + MySQL local environment.
- Production: hosted frontend + secured API + managed DB.

## Local Integrated Deployment

1. Create/import database using `database.sql`.
2. Configure server DB credentials and required env vars.
3. Start API:

```bash
cd server
npm install
node index.js
```

4. Open `index.html`.

## Recommended Production Setup

- Frontend: static hosting (Netlify/Vercel/GitHub Pages or equivalent)
- Backend: Node.js service host (VM/container/PaaS)
- Database: managed MySQL
- TLS: mandatory HTTPS

## Production Checklist

- Secrets stored outside source control
- Passwords hashed at rest
- CORS and auth headers configured
- Rate limiting on auth and reset endpoints
- Input validation on all write endpoints
- DB backups and restore test
- Error logging and monitoring enabled

## Rollout Checklist

- Verify role login by user type
- Verify reservation create/update/delete
- Verify request approval/rejection flow
- Verify billing transitions
- Verify reports data integrity
- Verify forgot-password path end to end

Last updated: 2026-02-28
