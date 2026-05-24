# SCENT Wellness

Patient SMS messaging portal for clinic outreach: manage patients, run timed message campaigns from procedure templates, and simulate patient and physician phones for testing.

**Stack:** Next.js (frontend, port 3000) · Fastify + Prisma + SQLite (backend, port 3001)

---

## Table of contents

- [User guide](#user-guide)
- [Quick start (developers)](#quick-start-developers)
- [Project layout](#project-layout)
- [Environment](#environment)
- [Testing](#testing)
- [Logging](#logging)
- [Troubleshooting](#troubleshooting)

---

## User guide

### Signing in

1. Open **http://localhost:3000** (or your deployed URL).
2. Sign in with your username and password.
3. After login you land on the main workspace. Use **Sign out** at the bottom of the left menu when finished.

**Default accounts** (development / demo only):

| Username | Password | Role  | What you can do |
|----------|----------|-------|-----------------|
| `admin`  | `password` | ADMIN | Full access: patients, templates, campaigns, simulator |
| `user`   | `password` | USER  | Same as admin for day-to-day use |
| `guest`  | `password` | GUEST | View templates only; cannot create patients, templates, or delete records |

> Change default passwords before any real deployment.

### Screen layout

```
┌─────────────┬──────────────────────────────────────┐
│  Menu       │  Main panel (Patient / Messages /     │
│  · Patient  │  Templates / Threads)                 │
│  · Messages │                                       │
│  · Templates├──────────────────────────────────────┤
│  · Threads  │  SMS Simulator (patient phone +       │
│             │  physician phones)                    │
└─────────────┴──────────────────────────────────────┘
```

Drag the dividers to resize the menu width and simulator height. Sizes are remembered in your browser.

### Typical workflow

1. **Patient** — Register or search for a patient, then select them (you are taken to **Messages**).
2. **Templates** — Create or edit a procedure template (sequence of timed SMS messages).
3. **Messages** — Choose physician SMS line and template, then **Start campaign**.
4. **Threads** — Watch active campaigns, countdowns, and completed threads.
5. **SMS Simulator** — See outbound messages on the patient phone; reply as the patient; see physician forwards on the matching physician line.

Scheduled messages are sent automatically by the backend scheduler (about every second in development). When all messages in a campaign are sent, the campaign moves to **completed** in **Threads**.

### Patient

- Fill in **Last Name**, **First Name**, **Date of Birth**, **MRN**, and **Cell Phone**, then **Submit** to create a record.
- Use **Search** (name, MRN, or phone) to find existing patients and click a row to select them.
- **ADMIN** and **USER** can **Delete** a patient from search results (with confirmation).
- Patient records are retained for **30 days**, then removed automatically.

### Templates

- Select an existing template from the list or create a new one with a unique **name**.
- Add one or more messages. Each row has:
  - **Message text**
  - **Delay** (weeks, days, hours, minutes, seconds) after campaign start
  - **Reply checkbox** — when checked, the patient *can* reply; when unchecked, replies get an automatic “does not accept replies” response
- Set **No-reply message** (sent when the patient texts back to a no-reply message).
- **Save** creates or updates the template. **Delete** removes it (ADMIN/USER only).
- **GUEST** can view templates but not save or delete.

### Messages

Works with the **currently selected patient** (from **Patient** or **Threads**).

1. Confirm patient details at the top.
2. Set **Physician SMS number** — which simulated physician phone receives forwarded patient answers (suggestions: Line 1–3). Your choice is remembered in the browser.
3. Choose a **Procedure template** and review the preview.
4. Click **Start campaign**.

While a campaign is **ACTIVE** you can:

- See each scheduled message, time until send, and **Sent** status.
- Toggle **patient replies** per message before it is sent (checkbox on each row).
- **Cancel campaign** to stop remaining messages.

After a successful start, the app switches to **Threads** so you can monitor progress.

### Threads

- **Active threads** (left tree): patients and campaigns still sending or awaiting replies. Expand a campaign to see message countdowns.
- **Completed threads** (right): finished campaigns. They are kept for **30 days**, then purged automatically.
- Click a patient or campaign in the tree to select them and open their context in **Messages** / the simulator.

### SMS Simulator

The lower pane simulates phones for testing (not real SMS).

**Patient phone (left)**

- Shows outbound clinic messages for the selected patient.
- **Tap a gray (clinic) bubble** to choose which message you are answering when several are unanswered.
- Type a reply and tap **Send**. Replies can be sent **out of order**; each answer is linked to the message you selected.
- Badges: **Replying here**, **Replied**.
- Patient replies do **not** echo back on the patient phone. If the message expects a reply, the answer is forwarded to the physician phone configured for the campaign.

**Physician phones (right)**

- Three lines (e.g. 555-555-5550 / 5551 / 5553). Only the line matching the campaign’s physician number shows that patient’s forwarded answers.

**Clear all messages**

- Removes all simulated SMS and physician inbox entries for every phone. Requires confirmation. Use between test runs.

### How replies are handled

| Message setting | Patient replies | What happens |
|-----------------|-----------------|--------------|
| **Replies on** (expects response) | Allowed | Answer is forwarded to the physician SMS number for that campaign |
| **Replies off** (no reply) | Allowed but discouraged | Patient receives the template’s no-reply auto-message; nothing is forwarded to the physician |
| Duplicate reply | — | Only one answer per outbound message is accepted |

### Roles summary

| Action | ADMIN | USER | GUEST |
|--------|:-----:|:----:|:-----:|
| View app / threads / simulator | ✓ | ✓ | ✓ |
| Create/edit patients | ✓ | ✓ | — |
| Delete patients | ✓ | ✓ | — |
| Create/edit/delete templates | ✓ | ✓ | — |
| Start / cancel campaigns | ✓ | ✓ | ✓* |
| Clear simulator messages | ✓ | ✓ | ✓ |

\*GUEST can use the simulator and campaigns if a patient is already selected; cannot create patients or templates.

---

## Quick start (developers)

From the project root (Windows PowerShell):

```powershell
npm run setup
npm run dev
```

Open **http://localhost:3000**.

Or use the helper script:

```powershell
.\scripts\start.ps1
```

### Two terminals

```powershell
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:frontend
```

### Reset dev environment

| Command | Purpose |
|---------|---------|
| `npm run dev:clean` | Free ports 3000 and 3001 |
| `npm run dev:reset` | Kill servers and delete `frontend/.next` cache |
| `npm run dev:fresh` | Reset + start `npm run dev` |

### Build

```powershell
npm run build
```

---

## Project layout

| Path | Description |
|------|-------------|
| `frontend/` | Next.js UI |
| `backend/` | Fastify API, Prisma, scheduler |
| `backend/src/contracts/` | Zod API response schemas (contract tests) |
| `e2e/` | Playwright end-to-end tests |
| `scripts/` | Dev port cleanup, E2E DB prepare |

---

## Environment

**Backend** (`backend/.env`):

| Variable | Example | Notes |
|----------|---------|--------|
| `DATABASE_URL` | `file:./dev.db` | SQLite path |
| `PORT` | `3001` | API port |
| `JWT_SECRET` | *(secret)* | Required in production |
| `FRONTEND_URL` | `http://localhost:3000` | CORS origin |
| `LOG_LEVEL` | `info` | Pino level |
| `LOG_FILE` | *(optional)* | File output |

**Frontend** (`frontend/.env.local`):

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` |

---

## Testing

### Unit and integration (Vitest)

```powershell
npm test                 # backend + frontend
npm run test:backend
npm run test:frontend
cd backend; npm run test:coverage
cd frontend; npm run test:coverage
```

- **Backend:** route tests (HTTP + SQLite `test.db`), lib unit tests, `integration/sms-flow.test.ts`, scheduler tests.
- **Frontend:** component and hook tests (jsdom), API client tests.

### Contract tests

Validates live API responses against Zod schemas in `backend/src/contracts/api-schemas.ts`:

```powershell
npm run test:contract
```

### End-to-end (Playwright)

Uses dedicated ports **3010** (web) and **3011** (API) and database `backend/prisma/e2e.db` so dev servers on 3000/3001 are unaffected.

```powershell
npm run test:e2e:install   # once: Chromium
npm run test:e2e
npm run test:e2e:ui        # interactive debugger
```

CI runs E2E after unit tests (see `.github/workflows/ci.yml`).

---

## Logging

- **Backend:** Pino structured logs with PHI redaction. HTTP logging via Fastify plugin; request ID from `x-request-id` header.
- **Audit:** `AuditLog` table for auth, patients, templates, campaigns, and SMS actions (metadata avoids PHI).
- **Frontend:** `clientLogger` in development; `api.ts` logs timing and errors with request IDs.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm run dev` does nothing (PowerShell) | Run `npm install` at root, then `npm run dev` again |
| Login fails / API errors | Backend must be on **3001**: `npm run dev:backend` |
| Database errors | `npm run db:generate` → `npm run db:migrate` → `npm run db:seed` |
| `EADDRINUSE` on 3000 or 3001 | `npm run dev:clean` or `npm run dev:fresh` |
| Next.js errors / blank page after build | `npm run dev:reset` then `npm run dev` |
| Campaign messages never send | Confirm backend is running (scheduler runs with the API) |
| Patient reply not on physician phone | Check **Physician SMS number** on the campaign; message must have **replies on** |
| Clear simulator does nothing | Ensure you are signed in; backend expects JSON body on POST |
| E2E port conflict | E2E uses 3010/3011; stop those with `Get-NetTCPConnection -LocalPort 3010` or run without dev servers |

---

## License

Private / internal use unless otherwise specified.
