# mini_project
# NexaResolve — Smart Issue Resolution Platform

Tagline: "Report Smart. Resolve Faster."

## Features
- JWT auth with roles: user, support agent, admin
- Complaint lifecycle, comments, internal notes (agent-only)
- AI categorization/priority via Python ML service (rule-based fallback)
- SLA due dates, overdue detection, automatic escalation (runs every minute)
- Real-time Socket.IO updates
- In-app notifications
- Dashboards, analytics charts, search/filter/pagination
- Premium midnight-navy UI with role-aware navigation
  (student/faculty workspace, department workspace, admin control center)
- Admin: complaint assignment, unassigned queue, SLA & escalation monitoring,
  user verification, audit log, analytics & reports
- Privacy by design: complainant identity and college ID are populated for
  administrators only and are enforced server-side, not hidden in the UI

## Project Structure
```
mini_project/
  client/ (React + Vite)
  server/ (Node + Express + MongoDB)
  ml-service/ (FastAPI + scikit-learn)
```

## Prerequisites (macOS)
- Node.js 18+ (tested 24)
- Python 3.9+
- MongoDB (optional; server uses in-memory MongoDB in development if MONGO_URI is unset)

## Install
```sh
cd client && npm install
cd ../server && npm install
cd ../ml-service && python3 -m pip install -r requirements.txt
```

## Environment
Copy `.env.example` to `.env` if needed. Defaults work for local dev. For persistent DB set `MONGO_URI`.

## Run
Terminal 1 (backend):
```sh
cd server && npm run dev
```
Terminal 2 (ML, optional):
```sh
cd ml-service && python3 -m uvicorn app:app --reload --port 8000
```
Terminal 3 (frontend):
```sh
cd client && npm run dev
```
Open http://localhost:5173

## Demo Accounts (seeded in development)
- admin@nexaresolve.dev / Password123!
- agent1@nexaresolve.dev / Password123!
- agent2@nexaresolve.dev / Password123!
- user1@nexaresolve.dev / Password123!
- user2@nexaresolve.dev / Password123!
- user3@nexaresolve.dev / Password123!

## Seed manually
```sh
cd server && npm run seed
```
(with MONGO_URI set for persistent DB)

## Tests & Build
Backend tests:
```sh
cd server && npm test
```
ML tests:
```sh
cd ml-service && python3 -m pytest tests/ -q
```
Frontend build:
```sh
cd client && npm run build
```

## Notes
- Automatic escalation job runs every minute.
- For quick SLA demo, set Critical resolution minutes to a small value in
  Admin -> Settings -> SLA and wait.
- ML model is a starter dataset (approx 50% measured accuracy); transparently reported in ml-service/models/metrics.json.
- Priority prediction is a documented rule-based baseline.
- Attachments are images only (max 5 per complaint, 5MB each).

## Limitations
- Email notifications are not implemented (in-app only).
- Business hours/calc time uses calendar minutes unless configured otherwise.
- Attachments are stored locally in server/src/uploads.
- In-memory DB resets on server restart unless MONGO_URI configured.
- Accounts are created by email registration. Official college-ID verification
  (issuing/verifying a college ID number against an external college registry) is
  not implemented, and any registered email can sign in. Adding it requires a new
  verification workflow, so it has deliberately not been invented.
- Department staff never receive complainant identity; only administrators do.
