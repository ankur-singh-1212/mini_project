# NexaResolve — Complete Technical Audit Report

> **Audit method:** Every claim below was verified by reading source files directly, plus loading the serialized model artifact with Python/joblib to confirm its actual internal structure. No README claim was accepted without code evidence. No project files were modified. Secrets, credentials, and environment values are referenced by name/location only — never reproduced.

**Legend:** ✅ Implemented & verified · ◐ Partially implemented · ⚙ Configured but not operational in runtime logic · ❌ NOT FOUND / NOT VERIFIED

---

## 1. Project Overview

### What is NexaResolve?
A **campus complaint/helpdesk ticketing platform** ("Report Smart. Resolve Faster.") with role-based dashboards for three roles: `user` (student/faculty), `agent` (department support staff), and `admin`. Evidence: `client/src/layouts/AppLayout.jsx` lines 24–91 defines three distinct navigation groups; `server/src/models/User.js` line 8 defines the role enum.

### Problem it solves
Manual complaint routing is slow and error-prone. The platform automates **category prediction, priority assignment, department routing, least-loaded agent assignment, SLA deadline tracking, and escalation**, with live dashboards and audit trails.

### Main objectives & functionalities (verified)
| Function | Evidence | Status |
|---|---|---|
| JWT auth + 3 roles | `server/src/controllers/authController.js`, `middleware/auth.js` | ✅ |
| Complaint lifecycle with 9 statuses | `server/src/models/Complaint.js:3`, transitions in `complaintController.js:13-22` | ✅ |
| Comments + internal notes | `complaintController.js:359-397`, `Comment.js` | ✅ |
| Auto category prediction (ML + fallback) | `services/predictionService.js:25-58` | ✅ |
| Rule-based priority prediction | `services/predictionService.js:64-90` | ✅ |
| Category→dept mapping + least-loaded assignment | `config/categoryDepartment.js`, `services/autoAssignService.js` | ✅ |
| Low-confidence review queue | `config/autoClassify.js`, `Complaint.js:84` | ✅ |
| SLA deadlines + breach detection | `services/slaService.js`, `jobs/slaCron.js`, `services/escalationService.js` | ✅ |
| Real-time Socket.IO updates | `server/src/sockets/index.js` | ✅ |
| In-app notifications | `services/notificationService.js` | ✅ |
| Analytics dashboards + Recharts charts | `client/src/pages/AdminDashboard.jsx`, `AdminAnalytics.jsx` | ✅ |
| Search/filter/pagination | `controllers/complaintController.js:213-247`, `userController.js:16-26` | ✅ |
| Audit log | `services/auditService.js`, `models/AuditLog.js` | ✅ |
| College-ID verification | `README.md:99-102` explicitly says not implemented; grep for `verif|collegeId|isVerified` in project source returned **no implementation** | ❌ |
| Email notifications | `README.md:95` — in-app only | ❌ |

### Complete technology stack

**Frontend** (`client/package.json`): React 18.3.1, ReactDOM, React Router DOM 6.28, Axios 1.7.9, Recharts 2.13.3, lucide-react 0.468, Socket.IO client 4.8, clsx + tailwind-merge. Build: Vite 6, Tailwind CSS 3.4, PostCSS, Autoprefixer, `@vitejs/plugin-react`. Dev proxy `/api` → `:5001` and `/socket.io` with websocket upgrade (`client/vite.config.js`).

**Backend** (`server/package.json`): Node.js + Express 4.21 (ES modules), Mongoose 8.9 / MongoDB, jsonwebtoken 9, bcryptjs 2.4, Zod 3.23, Multer 1.4 (image uploads), node-cron 3, Socket.IO 4.8, Helmet 8, CORS, Morgan, express-rate-limit. Test: `node --test` + Supertest + mongodb-memory-server.

**ML service** (`ml-service/requirements.txt`): Python 3.9, FastAPI 0.128.8, Uvicorn 0.39, scikit-learn 1.6.1, pandas 2.3.3, joblib 1.5.3; tests with pytest 8.4 + httpx 0.28.

**Architecture:** Three independently runnable services. Browser → Vite dev server (proxy) → Express REST API → MongoDB. Express → ML FastAPI over HTTP (`fetch`, `ML_SERVICE_URL`, default `http://localhost:8000`, 4s timeout) at complaint creation. Socket.IO runs on the same Express HTTP server (`server/src/server.js:19-23`). Real deployments need `MONGO_URI`; otherwise in-memory MongoDB is used in non-production (`config/database.js:6-21`).

---

## 2. AI/ML Model Identification — Highest Priority

### 2.1 Exact algorithm — verified from the serialized artifact
I loaded `ml-service/models/complaint_classifier.joblib` with joblib and inspected it:

```
TYPE: sklearn.pipeline.Pipeline
STEPS: ['tfidf', 'clf']
tfidf -> sklearn.feature_extraction.text.TfidfVectorizer
clf   -> sklearn.linear_model._logistic.LogisticRegression
CLASSES: 8 categories (see below)
TFIDF: stop_words='english', ngram_range=(1, 2), min_df=1, lowercase=True
CLF: C=1.0, penalty='l2', solver='lbfgs', max_iter=2000, multi_class='deprecated', random_state=42
VOCAB SIZE: 395
```

**Exact answer: TF-IDF + Multinomial-style Logistic Regression inside an sklearn `Pipeline`.**
It is **NOT** Random Forest, **NOT** Naive Bayes, **NOT** SVM, **NOT** a neural network, and **NOT** an LLM.

Source of construction — `ml-service/train_model.py:29-32`:
```python
pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=1)),
    ("clf", LogisticRegression(max_iter=2000, random_state=42)),
])
pipeline.fit(X_train, y_train)   # line 34
```
The joblib file was dumped at `train_model.py:54` and matches this definition exactly.

### 2.2 Is NLP actually implemented?
**Yes — classical statistical NLP**, not deep learning. Techniques verified:
- **TF-IDF vectorization** (`TfidfVectorizer`) — term frequency–inverse document frequency weighting.
- **N-grams (1,2)** — unigrams **and bigrams** (e.g. "not working").
- **Lowercasing** — `lowercase=True` (default, confirmed in loaded model).
- **English stop-word removal** — `stop_words="english"`.
- **Implicit tokenization** by scikit-learn's default token pattern (`(?u)\b\w\w+\b`) inside the vectorizer. There is **no separate explicit tokenizer** in project code.

Techniques **NOT** found: stemming, lemmatization, word embeddings / word2vec / GloVe, BERT/transformers, sequence models, POS tagging, named-entity recognition. `nltk`, `spacy`, `torch`, `transformers` appear **nowhere** in `ml-service/requirements.txt` or project source (grep hits were only inside third-party `.venv` files).

### 2.3 Python libraries
`fastapi`, `uvicorn`, `scikit-learn`, `pandas`, `joblib` (training/serving); `pytest`, `httpx` (testing). Full pins in `ml-service/requirements.txt:1-7`.

### 2.4 Pretrained or from scratch?
**Trained from scratch locally** — `train_model.py` reads `data/complaints.csv` and calls `pipeline.fit(...)`. There is no download of pretrained weights anywhere. The only pre-existing artifact is the already-trained `complaint_classifier.joblib` committed in `models/`.

### 2.5 Dataset
`ml-service/data/complaints.csv`: **96 data rows** + 1 header, 2 columns `text,label`. Verified class distribution — **8 classes × 12 samples each** (perfectly balanced):
`Technical Issue`, `Infrastructure and Maintenance`, `Electricity and Safety`, `Water and Sanitation`, `Academic or Administrative`, `Network and Internet`, `Hostel or Accommodation`, `Other`.
Self-described in `metrics.json:49` and README as a "starter demonstration dataset. Not a large real-world dataset."

### 2.6 Training procedure (`ml-service/train_model.py`)
1. `pd.read_csv(DATA_PATH)` → `X = df["text"]`, `y = df["label"]` (lines 18–20).
2. `train_test_split(X, y, test_size=0.25, random_state=42, stratify=stratify)` where `stratify = y if y.value_counts().min() >= 2 else None` (lines 22–27) → 72 train / 24 test.
3. Fit `Pipeline` (line 34).
4. Evaluate: `predict`, `predict_proba`, `accuracy_score`, `classification_report(output_dict=True, zero_division=0)`, `confusion_matrix(labels=pipeline.classes_)` (lines 35–40).
5. Write `models/metrics.json` (lines 42–52) and dump the pipeline with `joblib.dump` (line 54).

### 2.7 Prediction generation (`ml-service/app.py`)
- Startup: `joblib.load(MODEL_PATH)` into module-level `model` (lines 13–19).
- `POST /predict/category` (lines 28–39): accepts `{"text": str}`, strips it, returns 503 if no model, 400 if empty, else:
  ```python
  proba = model.predict_proba([text])[0]
  idx = int(proba.argmax())
  label = model.classes_[idx]
  confidence = float(proba[idx])
  return {"label": label, "confidence": round(confidence, 4), "classes": list(model.classes_)}
  ```
- `GET /health` reports `model_loaded` and stored accuracy.

### 2.8 Model inputs / outputs
| | Value |
|---|---|
| Input | One raw text string. In production the backend sends `title + " " + description` (`complaintController.js:41`) — notably **title is included** even though ML was trained only on `text` samples that look like single sentences. |
| Output | `label` (one of 8 category strings), `confidence` (max class probability), `classes` (all 8 labels). |
| Downstream | Backend maps `label` → department via `config/categoryDepartment.js`; `confidence` drives the `< 0.4` review gate (`config/autoClassify.js`). |

### 2.9 LLM / generative AI integration
❌ **NOT FOUND.** No Gemini, OpenAI, OpenRouter, Anthropic, LangChain, or any generative API client exists in project source (verified by grep; only unrelated third-party library contents matched). The words "AI" in the UI refer to this classical classifier and rule-based heuristics. **Priority is not predicted by any ML model at all** — `predictPriority()` in `server/src/services/predictionService.js:64-90` is a hand-written keyword rule engine.

---

## 3. Model Performance — from `ml-service/models/metrics.json` (actual values)

| Metric | Value |
|---|---|
| Accuracy | **0.5 (50%)** |
| Train size | 72 |
| Test size | 24 |
| Classes | 8 |
| Stratified split | Yes (`min_count=12 ≥ 2`, so `stratify=y` at `train_model.py:23-24`) |
| Random state | 42 |
| Macro avg precision / recall / F1 | 0.5774 / 0.5000 / 0.5006 |
| Weighted avg precision / recall / F1 | 0.5774 / 0.5000 / 0.5006 |
| Confusion matrix | ✅ Present — full 8×8 array in `metrics.json:68-149` |

**Per-class breakdown (verbatim from `classification_report`):**

| Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| Academic or Administrative | 0.00 | 0.00 | 0.00 | 3 |
| Electricity and Safety | 1.00 | 0.333 | 0.50 | 3 |
| Hostel or Accommodation | 0.50 | 0.667 | 0.571 | 3 |
| Infrastructure and Maintenance | 0.286 | 0.667 | 0.40 | 3 |
| Network and Internet | 0.50 | 0.333 | 0.40 | 3 |
| Other | 0.667 | 0.667 | 0.667 | 3 |
| Technical Issue | 1.00 | 0.667 | 0.80 | 3 |
| Water and Sanitation | 0.667 | 0.667 | 0.667 | 3 |

**Not invented / NOT FOUND:** no cross-validation scores, no ROC-AUC, no per-epoch curves, no precision@k, no calibration metrics, no separate validation set, no hyperparameter search results. Also note `metrics.json` accuracy (0.5) is stale unless `train_model.py` is re-run after data changes — serving code only reads it for `/health`, predictions always use the live joblib pipeline.

**Model limitations (evidence-based):**
- Only 96 samples / 12 per class → 3 test samples per class makes each metric extremely unstable; "Academic or Administrative" scored 0.00 on just 3 samples.
- ~50% accuracy vs 12.5% random baseline for 8 classes — weak.
- English stop-word removal can delete meaningful negation/context words; no stemming means "leaking"/"leak" are distinct features.
- `min_df=1` means rare words become features → poor generalization to unseen vocabulary.
- `predict_proba` confidence from a tiny logistic model is poorly calibrated, yet it gates the production review threshold (0.4).
- No retraining pipeline, no drift monitoring, no model versioning.

---

## 4. NLP and Complaint Classification — actual data flow

1. **User input** — only `title`, `description`, optional image attachments (`client/src/pages/CreateComplaint.jsx`). Category/priority/department fields were removed from the UI.
2. **Backend preprocessing** — `const text = [title, description].filter(Boolean).join(" ")` (`complaintController.js:41`). No explicit cleaning, normalization, or tokenization in Node.
3. **Category classification** — `predictCategory(text)` (`predictionService.js:25-58`):
   - `fetch(ML_URL + "/predict/category")` with `AbortSignal.timeout(4000)`.
   - On `res.ok`: returns `{category: data.label, confidence: data.confidence, source: "ml"}`.
   - On any error/non-OK: **rule-based fallback** — keyword lists `KEYWORDS` (7 categories), lowercase substring counting, highest hit count wins, default `"Other"`; `confidence = hits>0 ? min(0.5 + hits*0.1, 0.85) : 0.4`; `source: "rule-based-fallback"`.
4. **Priority assignment** — `predictPriority(text, category)` (`predictionService.js:64-90`): **100% rule-based**, never ML. Ordered keyword tiers:
   - `CRITICAL_WORDS` (fire, shock, gas leak, explosion, flood, collapse, injury, violence, emergency, bleeding) → `Critical`
   - else `HIGH_WORDS` (outage, down, broken, not working, urgent, exam, deadline, safety) → `High`
   - else `MEDIUM_WORDS` (slow, intermittent, issue, problem, request) → `Medium`
   - else `Low`
   - Adjustments: Electricity/Safety elevates to ≥ High; Water/Sanitation elevates Low → Medium. Returns `{priority, reason, source: "rule-based"}`.
5. **Department routing** — `resolveDepartment(finalCategory)` → `departmentNameForCategory()` static map → `Department.findOne({name})`.
6. **Assignment** — `pickLeastLoadedAgent(dept._id)` counts open complaints (`status ∉ {Resolved, Closed}`) per active agent, picks minimum, deterministic tie-break by name then id.
7. **Review gate** — `needsReview(confidence)` from `config/autoClassify.js`: true when confidence is non-finite or `< 0.4`; review cases skip agent assignment and are flagged `needsReview: true`.

**Sentiment analysis:** ❌ NOT FOUND — no lexicon, model, or polarity scoring anywhere.
**Urgency detection:** ✅ Present but purely keyword-based (step 4 above), not learned.

---

## 5. SLA Management

**Definition** — `server/src/models/SLAConfig.js`: `priority` (unique), `responseMinutes`, `resolutionMinutes`, `escalationEnabled` (default true), `atRiskPercent` (default 80), `description`, `updatedBy`. Four default rows seeded by `ensureDefaultSLA()` (`slaService.js:47-54`):
`Critical 15/60`, `High 60/240`, `Medium 480/1440`, `Low 1440/4320` (response/resolution minutes, **calendar minutes**, not business hours).

**Deadline calculation** — `slaService.js:17-25`:
- `dueDate = new Date(Date.now() + resolutionMinutes * 60 * 1000)`
- `firstResponseDueAt = new Date(Date.now() + responseMinutes * 60 * 1000)`
Both are computed at complaint creation (`complaintController.js:54-55`) and re-computed on admin priority change (`complaintController.js` `updateComplaint`) and on assignment with explicit priority.

**Status tracking** — `updateSLAStatus(complaint)` (`slaService.js:27-45`) mutates and caller saves:
- terminal statuses → `Met`; no dueDate → `On Track`; `now > due` → `Breached`; `(due-now)/(due-created) < 0.2` → `At Risk`; else `On Track`.

⚠ **Architectural gap:** the `At Risk` threshold is **hardcoded to 0.2 (20%)** at `slaService.js:43`. The configurable `SLAConfig.atRiskPercent` (default 80) is **written by the admin API** (`slaController.js:12-16`) but **never read by any business logic** — grep confirms it appears only in model, controller, and seed. So the Settings UI value for "at risk percent" has no runtime effect. ⚙

**Breach detection** — deadline-based only. `jobs/slaCron.js` schedules `runEscalationPass` every minute (`"*/1 * * * *"`, line 5); `escalationService.js:10-14` queries `dueDate < now`, non-terminal, `isEscalated: false`. Also refreshed on list/detail reads via `updateSLAStatus`.

**Predictive breach prediction:** ❌ NOT FOUND. No ML/time-series/forecasting component touches SLA.

**What happens on breach** (`escalationService.js:23-56`):
1. Atomic `findOneAndUpdate` claim sets `isEscalated: true`, `escalatedAt`, `slaStatus: "Breached"`, pushes `escalationHistory` entry `{level: 1, reason: "SLA deadline missed", scheduledJob: "escalation-cron"}` — idempotent.
2. Notifications (`type: "sla_breach"`) to the assigned agent (if any) **and every active admin**, plus Socket.IO emit on `complaint:<id>`.
3. Audit record `sla_escalation` (actor `null` = system).
4. A full `updateSlaStatuses()` pass refreshes all non-terminal complaints.

---

## 6. Escalation System

| Aspect | Verified reality |
|---|---|
| Levels | The schema `escalationSchema.level` (`Complaint.js:38-47`) can store any integer, but **`escalationService.js:27` only ever writes `level: 1`**, and `isEscalated` prevents a second pass. **Effectively single-level escalation.** |
| Triggers | `dueDate < now`, status not Resolved/Closed, `isEscalated: false`, and per-priority `SLAConfig.escalationEnabled !== false` (`escalationService.js:10-20`). |
| Automatic vs manual | Automatic only, via node-cron every minute in `jobs/slaCron.js`, started in `server.js:32`. ❌ No manual "escalate" endpoint or UI action exists. |
| Priority-based | Indirect: SLA deadlines differ per priority, so higher priorities breach sooner. There is no distinct escalation rule by priority. |
| Notifications | In-app `Notification` records + Socket.IO events to `user:<id>` rooms and `complaint:<id>` room. ❌ No email/SMS (README confirms). |
| ML contribution | ❌ None. ML only predicts category; priority is rule-based; escalation is pure deadline arithmetic. |
| Viewing history | Admin page `client/src/pages/Escalations.jsx` and complaint detail modal render `escalationHistory`; `GET /api/admin/escalations` returns escalated complaints. |

---

## 7. Backend Architecture — request/response flow

1. **Bootstrap** (`server/src/server.js`): load dotenv → create HTTP server + Socket.IO → `connectDatabase()` → `ensureDefaultSLA()` → `seedAll()` unless `AUTO_SEED=false` → `startEscalationJob(io)` → `listen(PORT)` (default 5001). Registers process-level unhandled rejection/exception handlers.
2. **App middleware chain** (`server/src/app.js:19-40`): Helmet (with cross-origin resource policy for uploaded images) → CORS (configurable origins, credentials) → Morgan logging → `express.json({limit:"2mb"})` + urlencoded → static `/uploads` → `/api/health` → 6 route modules → `errorHandler`.
3. **Auth flow**: `requireAuth` (`middleware/auth.js:4-17`) extracts `Bearer` token, verifies with `verifyToken()` (jsonwebtoken, secret from env with a hardcoded dev fallback in `utils/jwt.js` — value deliberately not reproduced here), loads active user minus password, sets `req.user`. `requireRole(...roles)` returns 403 on mismatch. Socket handshake uses the same token via `auth.token`/`query.token` (`sockets/index.js:15-27`).
4. **Validation**: Zod schemas in `server/src/validators/*`, applied by `middleware/validate.js` which parses `req.body` and returns 400 with `errors` on failure. Note: Zod objects strip unknown keys — this is what makes create-time client-supplied classification fields harmless.
5. **Async handling**: `utils/asyncHandler.js` wraps async controllers into `next(err)`; `middleware/errorHandler.js` logs and returns `{success:false,message}` with status from `err.status`/`statusCode` (500 default; production hides details).
6. **Controller → service → model** layering: controllers orchestrate; services (`predictionService`, `slaService`, `autoAssignService`, `escalationService`, `notificationService`, `auditService`, `complaintIdService`, `seedService`) hold business logic; Mongoose models define schema/indexes.
7. **Privacy enforcement** (server-side, not just UI): `maySeeReporter(user)` in `complaintController.js:31-33` and `escalationController.js:4-6` populates reporter identity **only for role `admin`** (and `user` for the broader complaint controller — the reporter themselves is already filtered by `canView`). `canView()` permits admin, reporter, or assigned agent. Agent-only internal notes filtered in `getComplaint` (`commentsFilter.isInternal = false` for users). Note: `maySeeReporter` includes `"user"` in `complaintController.js` but `listComplaints` restricts user queries to `filter.reporter = req.user._id`, so a user only ever receives their own identity.
8. **Rate limiting**: only `/api/auth/register` and `/api/auth/login` (`authRoutes.js:11-13`, 20 requests / 15 min). No global API rate limit.

---

## 8. Frontend Architecture

- **Entry**: `client/src/main.jsx` → `<React.StrictMode><App/></React.StrictMode>`.
- **Providers** (`App.jsx:29-33`): `AuthProvider` → `SocketProvider` → `ToastProvider` → `BrowserRouter`.
- **Routing** (`App.jsx:34-64`): public `/`, `/login`, `/register`; a `Protected` wrapper (auth check only — `components/Protected.jsx`) around `AppLayout`; all admin routes additionally wrapped in a single `ErrorBoundary` (`App.jsx:47-58`); catch-all redirect to `/`.
- **Layout** (`AppLayout.jsx`): role-aware sidebar groups, breadcrumb title map, mobile drawer, unread badge from `/api/notifications`, socket-driven refresh.
- **API client** (`services/api.js`): Axios instance with `baseURL: "/api"`, request interceptor injecting `Bearer <localStorage.token>`, response interceptor clearing the token and redirecting on 401.
- **State**: React Context for auth/socket/toasts; page-local `useState` for lists, filters, loading/error states.
- **Charts**: Recharts `BarChart`/`PieChart`/`ResponsiveContainer` in `AdminDashboard.jsx` and `AdminAnalytics.jsx`, with fixed parent heights, explicit readable axis/grid/tooltip colors, and `formatMonthLabel()` (`utils/formatMonth.js`) converting `2026-11` → `Nov-2026`.
- **Styling**: Tailwind utility classes + custom component layer in `client/src/index.css` (`.card`, `.btn`, `.badge`, midnight-navy palette). Navy is used for sidebar/overlays; content cards are light.
- **Complaint form** (`CreateComplaint.jsx`): title, description, up-to-5 image attachments only — no prediction call on typing. Detail page shows read-only "Auto-classified" labels and an admin-only override card.

---

## 9. Database

**Technology:** MongoDB via Mongoose 8.9. With no `MONGO_URI` and `NODE_ENV !== "production"`, an in-memory MongoDB is spun up automatically (`config/database.js:12-19`) — data is lost on restart. Persistent deployments require `MONGO_URI`.

| Collection (model file) | Important fields / relationships |
|---|---|
| `users` (`User.js`) | `name`, unique `email`, `password` (select:false, bcrypt hash), `role` enum, `department` → Departments, `phone`, `isActive`. Index on `role`. |
| `departments` (`Department.js`) | unique `name`, `description`, `isActive` (soft delete). |
| `complaints` (`Complaint.js`) | `complaintId` (unique, `NX-<year>-<seq>` from `Counter`), `title`, `description`, `category` (8-value enum), `priority` (4-value enum), `status` (9-value enum), `reporter` → Users, `assignedAgent` → Users, `department` → Departments, `attachments[]`, `dueDate`, `firstResponseDueAt`, `firstRespondedAt`, `slaStatus` (On Track/At Risk/Breached/Met), `history[]`, `escalationHistory[]`, `isEscalated`, `escalatedAt`, `prediction{}`, `autoClassified`, `autoConfidence`, `needsReview`, `agentPriority` (⚙ unused). Indexes: complaintId, status+priority, createdAt, department+status, needsReview. |
| `comments` (`Comment.js`) | `complaint` → Complaints, `author` → Users, `body`, `isInternal`. |
| `notifications` (`Notification.js`) | `user` → Users, `type`, `title`, `message`, `link`, `complaint` → Complaints, `read`. |
| `slaconfigs` (`SLAConfig.js`) | per-priority `responseMinutes`, `resolutionMinutes`, `escalationEnabled`, `atRiskPercent`, `updatedBy`. |
| `auditlogs` (`AuditLog.js`) | `actor` → Users (null = system), `action`, `entityType`, `entityId`, `details` (Mixed), `ip`. |
| `counters` (`Counter.js`) | `name`, `seq` — atomic per-year complaint ID sequence. |

"Tickets" are the `complaints` collection — there is no separate ticket model.

---

## 10. Complete System Workflow (corrected to actual implementation)

1. **Submission** — logged-in user submits title + description (+ images). Client sends `FormData` to `POST /api/complaints`; Multer stores images locally; Zod strips any extra fields.
2. **Receipt** — `createComplaint` (`complaintController.js:37`) reads only title/description.
3. **ML/NLP processing** — `predictCategory(title + " " + description)` calls FastAPI TF-IDF+LogisticRegression; on failure falls back to keyword rules. **ML does not predict priority** — `predictPriority` uses keyword tiers.
4. **Category → department** — static mapping in `config/categoryDepartment.js` resolves a `Department` by name.
5. **Review gate** — if `confidence < 0.4`, set `needsReview: true`, skip assignment (goes to admin unassigned queue). Otherwise pick the active agent with fewest open complaints in that department.
6. **SLA** — `dueDate` and `firstResponseDueAt` computed from the priority's SLA config; `slaStatus: "On Track"`.
7. **Persistence & side effects** — unique `NX-YYYY-NNNN` ID, history entries, notifications to reporter and assigned agent, audit entries (`complaint_created`, optional `complaint_needs_review`, `complaint_auto_assigned`), Socket.IO `complaint:new` to admins.
8. **Resolution work** — agents change status through validated transitions, add comments/internal notes; first agent/admin reply sets `firstRespondedAt`.
9. **Escalation** — every minute the cron finds overdue, non-terminal, non-escalated complaints, atomically marks level-1 escalation, notifies agent + admins, audits.
10. **Dashboard update** — `GET /api/admin/analytics` aggregates via MongoDB `$group`; dashboard/analytics pages render Recharts; Socket.IO events refresh detail views and unread badge.

⚠ **Correction to the naive workflow:** there is no "ML priority assignment," no sentiment step, no LLM, no multi-level escalation, and no external notification channel.

---

## 11. API Documentation (all routes from `server/src/routes/*`)

All endpoints are prefixed `/api`. All require `Authorization: Bearer <token>` except register/login. `A` = admin role required.

| Method | Endpoint | Purpose | Request | Response | Auth |
|---|---|---|---|---|---|
| POST | `/auth/register` | Create user account | `{name,email,password}` | `{success,token,user}` | none |
| POST | `/auth/login` | Sign in | `{email,password}` | `{success,token,user}` | none |
| GET | `/auth/me` | Current user | — | `{success,user}` | token |
| PATCH | `/auth/me` | Update name/phone | `{name?,phone?}` | `{success,user}` | token |
| GET | `/health` | Liveness | — | `{success,status,memoryDb}` | none |
| GET | `/departments` | List active departments | — | `{success,data[]}` | token |
| GET | `/complaints` | List (role-filtered, filter/sort/page) | query `status,category,priority,department,agent,q,from,to,page,limit,sort` | `{success,data[],pagination}` | token |
| POST | `/complaints/predict` | Preview classification | `{title?,description?}` | `{success,data:{category,priority,confidence,source,department,departmentName}}` | token |
| POST | `/complaints` | Create complaint (multipart) | `title,description`, `attachments[]` (≤5 images ≤5MB) | `{success,complaint}` 201 | token |
| GET | `/complaints/:id` | Detail + comments | — | `{success,complaint,comments}` | token + canView |
| PATCH | `/complaints/:id` | Edit | user: title/description; agent: subcategory; admin: classification/assignment (403 otherwise) | `{success,complaint}` | token + canView |
| PATCH | `/complaints/:id/status` | Validated status transition | `{status,note?,resolutionSummary?}` | `{success,complaint}` | token |
| POST | `/complaints/:id/comments` | Add comment | `{body,isInternal?}` | `{success,comment}` 201 | token + canView |
| POST | `/complaints/:id/assign` | Assign/reassign | `{agentId,departmentId?,priority?}` | `{success,complaint}` | **A** |
| GET | `/complaints/:id/history` | History + escalations | — | `{success,history,escalations}` | token + canView |
| GET | `/notifications` | My notifications | `unread,page,limit` | `{success,data[],unreadCount,pagination}` | token |
| PATCH | `/notifications/:id/read` | Mark read | — | `{success,notification}` | token |
| PATCH | `/notifications/read-all` | Mark all read | — | `{success}` | token |
| POST | `/ai/categorize` | Standalone prediction preview | `{text,category?}` | `{success,data:{category{},priority{}}}` | token |
| POST | `/ai/predict-priority` | Rule-based priority preview | `{text,category?}` | `{success,data:{priority,reason,source}}` | token |
| GET | `/admin/analytics` | Aggregates + charts data | `from?,to?` | `{success,data:{total,resolved,overdue,avgResolutionHours,slaCompliance,byStatus[],byCategory[],byPriority[],monthly[],agentWorkload[],departmentWorkload[]}}` | **A** |
| GET | `/admin/users` | User list | `role,q,page,limit` | `{success,data[],pagination}` | **A** |
| PATCH | `/admin/users/:id/role` | Change role | `{role}` | `{success,user}` | **A** |
| GET | `/admin/escalations` | Escalated complaints | — | `{success,data[]}` | **A** |
| GET | `/admin/audit` | Audit log | `page,limit` | `{success,data[],pagination}` | **A** |
| GET | `/admin/sla` | SLA config rows | — | `{success,data[]}` | **A** |
| PATCH | `/admin/sla/:priority` | Upsert SLA config | `{responseMinutes,resolutionMinutes,escalationEnabled,atRiskPercent?,description?}` | `{success,config}` | **A** |
| GET/POST | `/admin/departments` | List / create | dept fields | `{success,data[]}` / `{success,department}` 201 | **A** |
| PATCH/DELETE | `/admin/departments/:id` | Update / soft-delete | dept fields | `{success,department}` / `{success}` | **A** |

Socket.IO events (JWT-authenticated handshake): client→server `complaint:join`, `complaint:leave`; server→client `notification:new`, `complaint:new` (admins), `complaint:status`, `complaint:comment`, `complaint:assigned`, `complaint:escalated`.

---

## 12. Project Gaps and Improvements

### ✅ Actually implemented (verified)
JWT auth, role middleware, complaint lifecycle, comments/internal notes, ML category classification with fallback, rule-based priority, category→department mapping, least-loaded assignment, low-confidence review flag, SLA deadlines/status, minute-based escalation cron, in-app + socket notifications, analytics aggregation, Recharts dashboards, audit log, role-aware UI, server-side privacy enforcement, automated tests (32 Node tests, 3 ML tests).

### ◐ Partially implemented
- **Escalation levels** — schema supports N levels, runtime only ever writes level 1.
- **Audit detail richness** — `complaint_updated` for non-overrides sends no `details`; early seed records have minimal details.
- **Admin "user verification"** — README claims it, admin route exists for role changes, but no verification workflow or ID fields exist (README itself admits this).
- **SLA "At Risk" configuration** — stored and editable but ignored by runtime logic (hardcoded 20%). ⚙
- **`agentPriority`** field — present in schema, no read/write logic found. ⚙
- **`subcategory` / `location`** — schema and admin update still support them, but the user form no longer collects them.
- **`/api/complaints/predict`** — operational but unused by the current UI (legacy of the earlier auto-fill design).

### ❌ UI/mock-only or configured-not-operational
- No external verification, no email/SMS, no predictive breach ML, no multi-level escalation, no manual escalation action.
- No LLM anything.
- Demo/fallback: `MONGO_URI` unset → in-memory DB; JWT secret dev fallback; `AUTO_SEED` default on.

### Bugs / architectural weaknesses (evidence-based)
1. **Negative average resolution time** — `seedService.js:65` sets `resolvedAt = now - 2h` while Mongoose `createdAt = now`, so `resolvedAt - createdAt` is negative; `analyticsController.js:21-25` averages it. A live API check returned `avgResolutionHours: -2`.
2. **`slaCompliance` misnomer** — computed as `resolved/total` (`analyticsController.js:56`), not the share of complaints meeting SLA.
3. **`atRiskPercent` dead config** (see above).
4. **Insecure JWT fallback** — `utils/jwt.js:5,10` uses a hardcoded development secret when env is unset; no secret-strength validation.
5. **No CSRF protection / no refresh tokens** — JWT in `localStorage`, 7-day default expiry.
6. **Rate limiting only on auth** — other write endpoints unthrottled.
7. **Upload validation by mimetype only** (`complaintRoutes.js:20-23`) — spoofable; files stored locally in `server/src/uploads` with no scanning, no CDN, no size quota per user.
8. **Role change has no self-demotion guard** — `userController.js:28-36` comment acknowledges "prevent demoting self? optional."
9. **N+1 patterns** — escalation pass loads users and SLA config per complaint; analytics runs multiple aggregations; acceptable at demo scale, not production scale.
10. **No transaction around auto-assignment** — department/agent selection and complaint creation are separate operations; concurrent submissions can pick the same agent.
11. **ML service is optional at runtime** — if it is down, the much weaker keyword fallback silently handles all classification; there is no health indicator in admin UI.
12. **Model quality** — 50% accuracy with 3 test samples/class; threshold 0.4 gates routing on uncalibrated probabilities.
13. **`Protected` is auth-only** — role restrictions rely on server middleware (correct), but nav/routes are not role-guarded client-side beyond what the server returns.
14. **No `helmet` CSP details / no audit log immutability / no data retention policy** — typical college-project gaps.

### Production-readiness improvements (prioritized)
1. Replace hardcoded JWT fallback with mandatory strong secret; add refresh tokens + HttpOnly cookies + CSRF tokens.
2. Fix seed `resolvedAt` bug; add `firstRespondedAt`-based SLA compliance metric.
3. Wire `atRiskPercent` into `updateSLAStatus`; add multi-level escalation with configurable rules and manual escalation endpoint.
4. Retrain classifier on a larger, domain-specific, deduplicated dataset with cross-validation, calibration, and model versioning; add retraining CI.
5. Move uploads to object storage with content sniffing, per-user quotas, and virus scanning.
6. Use DB transactions / atomic counters for assignment; add indexes for the new query patterns; add caching for analytics.
7. Add global rate limiting, input size guards, structured logging, health/readiness probes for ML service, and UI warning when fallback is active.
8. Implement the advertised verification workflow or remove the claim; add email notifications if promised.

---

## 13. Technical Viva Preparation

### 13.1 General technical questions (30)

1. **What is NexaResolve?** A role-based campus complaint ticketing system with automated classification, assignment, SLA and escalation. (`README.md`, `App.jsx`)
2. **What are the three roles and their home routes?** `user→/dashboard`, `agent→/agent`, `admin→/admin` (`AuthContext.jsx:76-82`).
3. **Which frontend framework/build tool?** React 18 with Vite 6 (`client/package.json`).
4. **Which backend framework?** Express 4 on Node with ES modules (`server/package.json`, `app.js`).
5. **Which database and ORM?** MongoDB with Mongoose 8 (`config/database.js`, models).
6. **What happens if no MONGO_URI is set?** In-memory MongoDB in dev/test; production throws (`database.js:12-20`).
7. **How is authentication implemented?** bcrypt password hashing + JWT stored in localStorage, sent as `Bearer` (`authController.js`, `utils/jwt.js`, `api.js`).
8. **How does `requireAuth` work?** Verifies token, loads active user minus password, sets `req.user` (`middleware/auth.js`).
9. **How is authorization enforced?** `requireRole("admin")` on admin routes; `canView()` per complaint (`adminRoutes.js:11`, `complaintController.js:24-28`).
10. **How are request bodies validated?** Zod schemas via `middleware/validate.js`; 400 + errors on failure.
11. **What does `asyncHandler` do?** Wraps async controllers and forwards rejected promises to `next(err)`.
12. **How are files uploaded?** Multer disk storage, images only, max 5 files × 5MB, saved to `server/src/uploads`.
13. **How is complaint ID generated?** `Counter.findOneAndUpdate` with `$inc` → `NX-<year>-<4-digit seq>`.
14. **How many complaint statuses?** 9, with a transition map (`Complaint.js:3`, `complaintController.js:13-22`).
15. **What is an internal note?** A comment with `isInternal: true`, allowed only for agent/admin, hidden from users (`complaintController.js:153-155`).
16. **How are complainant identities protected?** `maySeeReporter()` controls population; agents never receive reporter name/email (`complaintController.js:30-33`, tests confirm).
17. **How do real-time updates work?** Socket.IO with JWT handshake, per-user/per-complaint rooms, join permission checked via `canView`.
18. **What is the ErrorBoundary for?** Catches render crashes in admin pages, shows a message + reload instead of a blank page (`components/ErrorBoundary.jsx`, `App.jsx:47`).
19. **Which chart library?** Recharts; bar/pie charts with fixed-height containers (`AdminDashboard.jsx`, `AdminAnalytics.jsx`).
20. **Why `formatMonthLabel`?** Converts API `YYYY-MM` into readable `Nov-2026` on axis and tooltip (`utils/formatMonth.js`).
21. **How does the client talk to the backend?** Axios instance with `/api` baseURL; Vite proxies `/api` and `/socket.io` to port 5001.
22. **What are the admin dashboards?** Operations overview, analytics, escalations, unassigned queue, users, departments, audit, SLA settings.
23. **How does the admin override work?** Admin-only card in `ComplaintDetail.jsx` calls `PATCH /complaints/:id` and `POST /complaints/:id/assign`; audited as `complaint_override`/`complaint_assigned`.
24. **What is `needsReview`?** Flag set when prediction confidence < 0.4; complaint is not auto-assigned and appears in admin queue (`config/autoClassify.js`).
25. **How are audit logs written?** `recordAudit()` writes `AuditLog` docs; failures are logged, not thrown.
26. **What is the escalation cron expression?** `"*/1 * * * *"` — every minute (`jobs/slaCron.js:5`).
27. **How is escalation idempotent?** Atomic `findOneAndUpdate({_id, isEscalated:false}, {$set:{isEscalated:true,...}})`.
28. **Which tests exist?** 32 Node tests (`tests/api.test.js`, `tests/autoAssign.test.js`) and 3 ML tests (`ml-service/tests/test_app.py`).
29. **How does pagination work?** `page`/`limit` query params, `skip`/`limit` in Mongoose, `pagination` object in response.
30. **Name one real bug found in the audit.** Seed sets `resolvedAt` 2h before creation, producing negative `avgResolutionHours` in analytics.

### 13.2 AI/ML & NLP questions (15)

1. **Exact model?** `sklearn.pipeline.Pipeline` = `TfidfVectorizer` → `LogisticRegression` (`train_model.py:29-32`; verified in joblib).
2. **Random Forest or Naive Bayes?** Neither. Verified by loading the model: final estimator is `LogisticRegression`.
3. **Which NLP techniques?** TF-IDF, unigrams+bigrams, lowercase, English stop-word removal; implicit tokenization.
4. **Stemming/lemmatization?** ❌ Not used.
5. **Embeddings/transformers?** ❌ Not used; no torch/transformers dependency.
6. **Is it pretrained?** No — trained from scratch on the local CSV.
7. **Dataset?** 96 training examples, 8 balanced classes × 12, columns `text,label` (`data/complaints.csv`).
8. **Train/test split?** 75/25 = 72/24, `random_state=42`, stratified.
9. **Accuracy?** 0.5 (50%) from `metrics.json`.
10. **F1 macro / weighted?** 0.5006 both; "Academic or Administrative" F1 = 0.
11. **How are predictions served?** FastAPI loads joblib at startup; `predict_proba`, argmax, returns label + confidence (`app.py:28-39`).
12. **How does the Node backend call ML?** `fetch(ML_URL + "/predict/category")` with 4s timeout (`predictionService.js:28-33`).
13. **What if ML is down?** Keyword-rule fallback with confidence 0.4–0.85, `source: "rule-based-fallback"`.
14. **Is priority predicted by ML?** No — `predictPriority()` is pure keyword rules with category adjustments (`predictionService.js:64-90`).
15. **Any LLM/Gemini/OpenAI?** ❌ NOT FOUND anywhere in project source. "AI" labels in UI refer to this classifier and rule engine.

### 13.3 SLA & escalation questions (10)

1. **Where is SLA defined?** `SLAConfig` collection, one doc per priority, seeded by `ensureDefaultSLA()`.
2. **Default values?** Critical 15/60, High 60/240, Medium 480/1440, Low 1440/4320 (response/resolution minutes).
3. **How is dueDate computed?** `now + resolutionMinutes × 60 × 1000` (`slaService.js:17-20`).
4. **What is firstResponseDueAt?** `now + responseMinutes × 60 × 1000`.
5. **What are the SLA statuses?** On Track, At Risk, Breached, Met.
6. **How is At Risk decided?** `(due - now)/(due - created) < 0.2` — hardcoded 20%, **not** the configurable `atRiskPercent`.
7. **How is a breach detected?** `dueDate < now` query in the minute cron, plus `updateSLAStatus` on reads.
8. **What happens on breach?** Atomic claim, level-1 `escalationHistory`, notify agent + all active admins, socket emit, audit entry.
9. **Is there ML breach prediction?** No — deadline arithmetic only.
10. **How many escalation levels in practice?** One. The schema allows more but runtime only writes level 1 and the `isEscalated` flag blocks repeats.

### 13.4 Architecture & backend questions (10)

1. **Describe the request flow.** Middleware chain → auth → validation → async controller → services → Mongoose → response → sockets/notifications/audit.
2. **Why a separate ML service?** Python/scikit-learn ecosystem isolated from Node; communicates over HTTP; independently deployable and optional.
3. **How is least-loaded assignment implemented?** Query active agents in dept, `countDocuments` open complaints each, pick minimum with deterministic tie-break (`autoAssignService.js:18-41`).
4. **How is category→department mapping stored?** Static editable JS object `CATEGORY_DEPARTMENT` in `server/src/config/categoryDepartment.js` keyed by exact category name.
5. **What guarantees user can't set category/priority/department?** Zod strips them on create; `updateComplaint` returns 403 for non-admins sending restricted keys; `/assign` is admin-only.
6. **What does `needsReview` do?** Skips auto-assignment and surfaces the complaint in the admin unassigned queue with a warning badge.
7. **How are analytics computed?** MongoDB aggregation `$group` by status/category/priority/month/dept/agent plus `countDocuments` for totals (`analyticsController.js`).
8. **How does Socket.IO authorize?** Same JWT in handshake; rooms `user:<id>`, `admins`, `complaint:<id>`; join permission checked against `canView`.
9. **What is the fallback database for tests/dev?** `mongodb-memory-server`, created in `config/database.js`.
10. **Name two production weaknesses.** Hardcoded JWT dev fallback and no transaction around auto-assignment (plus dead `atRiskPercent` config).

---

## 14. Final Technical Summary

1. **Exact ML model:** `sklearn.pipeline.Pipeline` with `TfidfVectorizer(stop_words='english', ngram_range=(1,2), min_df=1, lowercase=True)` followed by `LogisticRegression(C=1.0, penalty='l2', solver='lbfgs', max_iter=2000, random_state=42)` — serialized at `ml-service/models/complaint_classifier.joblib`, built by `ml-service/train_model.py:29-54`. **Not** Random Forest / Naive Bayes / SVM / neural net.
2. **Exact NLP techniques:** TF-IDF weighting, unigrams + bigrams, lowercasing, English stop-word removal, implicit regex tokenization. No stemming, lemmatization, embeddings, or deep NLP.
3. **Dataset:** `ml-service/data/complaints.csv` — 96 training examples, 2 columns (`text`,`label`), 8 perfectly balanced classes (12 each); starter/demo dataset, stratified 72/24 split with seed 42.
4. **Actual model performance:** accuracy **0.50**; macro avg F1 **0.5006**; weighted avg F1 **0.5006**; per-class F1 from 0.00 (Academic or Administrative) to 0.80 (Technical Issue); full 8×8 confusion matrix present in `metrics.json`. No cross-validation or additional metrics.
5. **AI/LLM integration:** ❌ No LLM or generative API (Gemini/OpenAI/OpenRouter/Anthropic) integrated. "AI" = this classical classifier + hand-written keyword rules for priority, fallback and urgency.
6. **SLA implementation:** Per-priority `SLAConfig` docs; `dueDate`/`firstResponseDueAt` from calendar minutes; `updateSLAStatus` sets On Track/At Risk/Breached/Met (At Risk hardcoded at 20%, ignoring editable `atRiskPercent`); no predictive breach detection.
7. **Escalation implementation:** node-cron every minute → atomic one-time level-1 escalation of overdue non-terminal complaints → in-app + Socket.IO notifications to assigned agent and all active admins + audit entry. No multi-level, no manual trigger, no ML input, no email.
8. **Complete stack:** React 18 + Vite 6 + Tailwind + Recharts + React Router + Axios + Socket.IO client; Node/Express 4 + Mongoose 8/MongoDB (in-memory fallback) + Zod + JWT/bcrypt + Multer + node-cron + Socket.IO + Helmet/CORS/Morgan; Python 3.9 FastAPI + scikit-learn + pandas + joblib.
9. **Five strongest features:** (a) verified ML classifier with transparent rule-based fallback and confidence-gated review queue; (b) strict server-enforced auto-classification/routing (client fields ignored, 403 on user edits); (c) least-loaded agent assignment; (d) automatic SLA breach detection + idempotent escalation with notifications; (e) comprehensive audit log with role-aware privacy enforcement.
10. **Five major limitations:** (a) 50% accuracy on a 96-row toy dataset with uncalibrated confidence driving routing; (b) no LLM/semantic understanding and no sentiment analysis; (c) `atRiskPercent` configured but not used, escalation effectively single-level; (d) negative `avgResolutionHours` from a seed-data bug and `slaCompliance` mislabeled; (e) college-ID verification and email notifications are absent, JWT dev fallback + local unscanned uploads make it non-production-ready.

**Explicit NOT FOUND / NOT VERIFIED items:** LLM/GenAI integration, sentiment analysis, stemming/lemmatization, embeddings, cross-validation metrics, predictive SLA breach ML, multi-level or manual escalation, email/SMS notifications, college-ID verification, usage of `agentPriority`, live runtime effect of `atRiskPercent`.

---

*Report generated from direct source inspection only. No project files were modified; no secrets or credentials were reproduced.*
