# SCENT Wellness

Patient SMS messaging portal — Next.js frontend + Fastify/Prisma/SQLite backend.

## Quick start

```bash
# From repo root
npm install

# Backend: generate client, apply migration, seed users
cd backend
npx prisma generate
npx prisma migrate deploy
npm run db:seed

# Terminal 1 — API (port 3001)
npm run dev

# Terminal 2 — Frontend (port 3000)
cd ../frontend
npm run dev
```

Open http://localhost:3000

### Default logins

| Username | Password | Role  |
|----------|----------|-------|
| admin    | password | ADMIN |
| user     | password | USER  |
| guest    | password | GUEST (templates read-only) |

## Layout

- **Left:** Patient · Messages · Templates
- **Center:** Form for active section
- **Lower:** SMS simulator (patient thread + physician forwards)

## Scheduler

The backend runs a 1-second interval worker that sends due `ScheduledMessage` rows to the patient simulator when `sendAt <= now`.

Template offsets (weeks, days, hours, minutes, seconds) are added from campaign start time.

## Environment

Copy `.env.example` to `backend/.env`. Frontend uses `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:3001`.
