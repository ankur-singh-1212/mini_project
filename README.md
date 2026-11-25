# NexaResolve — Smart College Complaint Management System

Tagline: "Report Smart. Resolve Faster."

## Overview

NexaResolve is a complaint management platform built for college communities. Students and faculty report issues (infrastructure, electricity and safety, water and sanitation, network and internet problems, academic or administrative requests, and more). Each complaint is auto-categorized, assigned a priority, gets an SLA deadline, and escalates automatically when the deadline passes. The system is built as a React + Vite frontend, a Node + Express + MongoDB backend, and a Python FastAPI ML service for categorization.

## Key Features

- **Authentication and roles:** JWT auth with roles: user, support agent, admin (`jsonwebtoken`, `bcryptjs`; see `server/src/middleware/auth.js`).
- **Complaint lifecycle:** statuses `Submitted`, `Under Review`, `Assigned`, `In Progress`, `Awaiting User`, `Resolved`, `Closed` (and `Reopened`) — see `server/src/models/Complaint.js`.
- **Comments and internal notes:** public comments plus agent-only internal notes.
- **AI categorization and priority prediction:** see [ML-based Categorization and Priority Prediction](#ml-based-categorization-and-priority-prediction).
- **SLA due dates and automatic escalation:** per-priority response/resolution times with automatic escalation — see [SLA Auto-Escalation](#sla-auto-escalation).
- **Real-time Socket.IO updates:** websocket updates for complaints (`server/src/sockets/index.js`).
- **In-app notifications:** notifications with links into the app.
- **Dashboards, analytics and charts:** chart-based dashboards and analytics (recharts, `client/src/pages/AdminAnalytics.jsx`).
- **Role-aware UI:** student/faculty workspace, department workspace, and an admin control center (client pages under `client/src/pages`).
- **Admin tools:** complaint assignment, unassigned queue, SLA and escalation monitoring, user management, audit log, analytics and reports.
- **Search, filter and pagination:** complaints can be filtered by status, category, priority, department, assigned agent, text query and date range, with pagination and sort (`server/src/controllers/complaintController.js`).
- **Attachments:** up to 5 image attachments per complaint (png, jpeg, jpg, gif, webp), 5 MB limit (`server/src/routes/complaintRoutes.js`).
- **Privacy by design:** complainants are identified server-side and reporter details are only surfaced per role rules (`maySeeReporter` in `server/src/controllers/complaintController.js`).

## ML-based Categorization and Priority Prediction

When a complaint is submitted, the server predicts a category and a priority (`POST /categorize` and `POST /predict-priority` in `server/src/routes/aiRoutes.js`, via `server/src/controllers/aiController.js`):

- **Category prediction is ML-based first:** the server calls the ML service at `ML_SERVICE_URL` (default `http://localhost:8000`) with `POST /predict/category`. The FastAPI service (`ml-service/app.py`) returns the predicted label and confidence from the trained `models/complaint_classifier.joblib` model. If the ML service is unavailable or errors, the server falls back transparently.
- **Priority prediction is rule-based** (`server/src/services/predictionService.js`): keyword matching assigns `Critical`, `High` or `Medium` priority, with category adjustments (e.g. `Electricity and Safety` is elevated to `High`, `Water and Sanitation` to at least `Medium`).
- Predictions are stored on the complaint (`prediction`, `autoClassified`, `needsReview` fields in `Complaint.js`).

The ML model is a starter dataset; its measured accuracy is reported in `ml-service/models/metrics.json`, and `ml-service/train_model.py` retrains it.

## SLA Auto-Escalation

- **SLA configuration:** `SLAConfig` holds per-priority `responseMinutes` and `resolutionMinutes` (plus `escalationEnabled` and `atRiskPercent`). Defaults are seeded on startup by `server/src/services/slaService.js` (`ensureDefaultSLA`):
  - Critical: 15 min response / 60 min resolution
  - High: 60 / 240
  - Medium: 480 / 1440
  - Low: 1440 / 4320
- **Due dates:** `dueDateFor(priority)` sets `dueDate = now + resolutionMinutes`.
- **Escalation job:** `server/src/jobs/slaCron.js` schedules `runEscalationPass` every minute (`*/1 * * * *`, node-cron).
- **Pass behavior** (`server/src/services/escalationService.js`): finds complaints where `dueDate < now`, status is not `Resolved`/`Closed`, and not already escalated; respects per-priority `escalationEnabled: false`; atomically claims a complaint (`findOneAndUpdate`), then marks it `isEscalated`/`escalatedAt` and `slaStatus: "Breached"`, appends an escalation-history entry (level 1, reason "SLA deadline missed", scheduledJob "escalation-cron"), creates notifications for the assigned agent and active admins, emits a Socket.IO event `complaint:escalated`, and records an audit entry.
- **SLA status updates:** `updateSLAStatus` (`server/src/services/slaService.js`) sets `On Track`, `At Risk` (default at 80% of the SLA window), `Breached` (past due) or `Met` (for resolved/closed complaints).

## Technology Stack

- **Frontend:** React 18 + Vite, Tailwind CSS, react-router-dom, lucide-react, recharts, socket.io-client, axios (`client/package.json`).
- **Backend:** Node.js + Express 4, Mongoose 8, Socket.IO 4.8.1, jsonwebtoken, bcryptjs, dotenv, zod, node-cron, mongodb-memory-server (dev); tests with `node --test` (`server/package.json`).
- **ML service:** FastAPI 0.128.8 + uvicorn 0.39.0, scikit-learn 1.6.1, pandas, joblib, httpx (`ml-service/requirements.txt`).
- **Database:** MongoDB — the server uses `MONGO_URI` when set, and the in-memory MongoDB via `mongodb-memory-server` in development; production requires `MONGO_URI` (`server/src/config/database.js`).

## Project Structure

```
mini_project/
  client/      # React + Vite frontend (pages, components, contexts, services)
  server/      # Node + Express + MongoDB backend (controllers, models, routes, services, jobs, config, middleware)
  ml-service/  # FastAPI + scikit-learn service (app.py, train_model.py, models/, data/, tests/)
```

## Prerequisites (macOS)

- Node.js 18+ (tested 24)
- Python 3.9+

## Install

```sh
cd client && npm install
cd ../server && npm install
cd ../ml-service && python3 -m pip install -r requirements.txt
```

## Environment

Copy `.env.example` to `.env` if needed. Defaults work for local development. For persistent storage set `MONGO_URI`.

## Run

Terminal 1 (backend):
```sh
cd server && npm run dev
```
Terminal 2 (ML service, optional):
```sh
cd ml-service && python3 -m uvicorn app:app --reload --port 8000
```
Terminal 3 (frontend):
```sh
cd client && npm run dev
```
Open http://localhost:5173. The backend listens on `http://localhost:5001` and auto-seeds demo data on first start (`AUTO_SEED=true`).

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
(with `MONGO_URI` set for a persistent DB)

## Tests and Build

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

- The automatic escalation job runs every minute.
- Priority prediction is a documented rule-based baseline; category prediction is ML-first.
- Attachments are images only (max 5 per complaint, 5 MB limit).

## Limitations

- Notifications are in-app; the backend has no email provider wired in (no `nodemailer`/SMTP usage in `server/`).
- In-memory DB resets on server restart unless `MONGO_URI` is configured.
- Accounts are created by email registration. Official college-ID verification
  (issuing/verifying a college ID number against an external college registry) is
  not implemented; any registered email can sign in.
