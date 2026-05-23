# SCENT Wellness

Patient SMS messaging portal — Next.js frontend + Fastify/Prisma/SQLite backend.

## Quick start (Windows PowerShell)

From the project root:

```powershell
npm run setup
npm run dev
```

Then open **http://localhost:3000**

Or use the helper script:

```powershell
.\scripts\start.ps1
```

> **Note:** Do not use `npm run dev` with the old `&` syntax in PowerShell. The root `dev` script uses `concurrently` to run both servers.

### Two terminals (alternative)

```powershell
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:frontend
```

### Default logins

| Username | Password | Role  |
|----------|----------|-------|
| admin    | password | ADMIN |
| user     | password | USER  |
| guest    | password | GUEST (templates read-only) |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm run dev` does nothing (PowerShell) | Run `npm install` at root, then `npm run dev` again |
| Login fails / API errors | Ensure backend is on port **3001**: `npm run dev:backend` |
| Database errors | `npm run db:generate` then `npm run db:migrate` then `npm run db:seed` |
| Port already in use | Stop other Node processes or change `PORT` in `backend/.env` |

## Layout

- **Left:** Patient · Messages · Templates
- **Center:** Form for active section
- **Lower:** SMS simulator (patient phone + 3 physician phones)

## Environment

- `backend/.env` — `DATABASE_URL`, `PORT=3001`, `JWT_SECRET`, `FRONTEND_URL`
- `frontend/.env.local` — `NEXT_PUBLIC_API_URL=http://localhost:3001`
