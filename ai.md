# GreenVision AI — Developer & AI Context

Last updated: 2026-08-16 (full codebase scan — all modules, routers, queries, UI components, migrations)

---

## Quick Reference: What's Where

| Need | Go to |
|---|---|
| AI vision inference | `backend/ml/predictor.py` |
| DB pool init | `backend/db/pool.py` → `init_pool()` / `close_pool()` |
| All DB queries | `backend/db/queries/<resource>.py` — raw asyncpg, NO ORM |
| Pydantic schemas | `backend/schemas/models.py` |
| JWT / bcrypt | `backend/core/security.py` |
| Config / env vars | `backend/core/config.py` → `get_settings()` (lru_cached) |
| Auth guards | `backend/core/dependencies.py` → `get_current_user`, `require_admin` |
| API axios client | `frontend/src/api/client.ts` — baseURL `/api`, auth interceptors |
| Auth state / context | `frontend/src/context/AuthContext.tsx` |
| Routes | `frontend/src/App.tsx` |
| All API call fns | `frontend/src/api/<resource>.ts` |

---

## Folder Structure

```
/
├── frontend/                    # React 19 SPA (Vite + TypeScript + Tailwind v4)
│   ├── Dockerfile               # nginx production image
│   ├── vite.config.ts           # proxy: /api → http://localhost:8000
│   ├── index.html
│   └── src/
│       ├── App.tsx              # BrowserRouter, all routes, QueryClientProvider, Toaster
│       ├── index.css            # @import tailwindcss; custom scrollbar; shimmer animation
│       ├── main.tsx
│       ├── api/                 # ALL API call functions — one file per resource
│       │   ├── client.ts        # axios instance (baseURL=/api), request/response interceptors
│       │   ├── auth.ts          # login, signup, getMe, updateProfile (PATCH /auth/me), changePassword (POST /auth/change-password)
│       │   ├── reports.ts       # CRUD + approve/reject + deleteReport (soft-delete) + pagination & reporter info
│       │   ├── schedule.ts      # collection schedule CRUD
│       │   ├── rewards.ts       # summary, history, redeem (generates real secrets-based voucher code)
│       │   ├── feedback.ts      # ticket submit + admin respond (threaded chat UI)
│       │   ├── organic.ts       # listings, requests, legacy claims/records
│       │   └── stats.ts         # KPI views: platform totals, daily, zones, impact, leaderboard
│       ├── context/
│       │   └── AuthContext.tsx  # AuthProvider: user, role, tokens, login, signup, updateProfile, logout
│       ├── hooks/
│       │   └── useAuth.ts       # re-exports useContext(AuthContext)
│       ├── types/               # TypeScript interfaces (WasteReport, User, CollectionSchedule, etc.)
│       ├── components/
│       │   ├── AdminDashboard.tsx      # Reports dispatch, schedule overview, organic log, filters
│       │   ├── ResidentDashboard.tsx   # My reports, rewards stats, collection schedule sidebar
│       │   ├── Navbar.tsx              # Sticky header, role-aware nav, mobile drawer, profile avatar
│       │   ├── ProgressiveImage.tsx    # Lazy image from base64 with blur placeholder
│       │   ├── Skeletons.tsx           # TableRowSkeleton, StatsWidgetSkeleton, ReportCardSkeleton, ScheduleCardSkeleton
│       │   └── CameraCapture.tsx       # Camera/file capture for ReportFlowPage
│       └── pages/
│           ├── LandingPage.tsx          # Public hero + KPI cards from /api/stats/platform
│           ├── LoginPage.tsx            # Email + password login
│           ├── ResidentSignupPage.tsx   # Name + email + password only
│           ├── AdminSignupPage.tsx      # Name + email + password only
│           ├── DashboardPage.tsx        # Renders AdminDashboard or ResidentDashboard by role
│           ├── ReportFlowPage.tsx       # Multi-step: camera → AI analysis → submit
│           ├── SchedulePage.tsx         # Public schedule list; admin can create/update/delete
│           ├── RewardsPage.tsx          # Summary card, history table, redeem catalog
│           ├── OrganicWastePage.tsx     # Marketplace listings + resident request flow + admin mgmt
│           ├── FeedbackPage.tsx         # Submit ticket; admin respond/resolve
│           └── ProfilePage.tsx          # Avatar upload, edit name/phone/address, read-only stats
│
├── backend/                     # FastAPI (Python 3.13 / asyncio)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py                  # FastAPI app, lifespan (init_pool/close_pool), CORS, router mounts at /api
│   ├── .env                     # Local secrets — NOT committed
│   ├── .env.example             # All required env vars documented
│   ├── core/
│   │   ├── config.py            # Pydantic BaseSettings — reads .env; lru_cached get_settings()
│   │   ├── security.py          # bcrypt hash/verify, JWT create/decode (jose), generate_tokens()
│   │   └── dependencies.py      # FastAPI Depends: get_db (asyncpg conn), get_current_user, require_admin
│   ├── db/
│   │   ├── pool.py              # Singleton asyncpg pool; also runs ALTER TABLE migrations on startup
│   │   ├── schema.sql           # Base DDL — run once on Supabase
│   │   ├── migrations/
│   │   │   ├── 001_kpi_views.sql              # 4 plain SQL views: daily_report_stats, zone_performance, impact_summary, user_activity_rank
│   │   │   ├── 002_soft_delete_and_organic.sql # hidden_for on reports; extended organic_waste_listings; organic_waste_requests table; profile_image on users
│   │   │   └── 003_add_estimated_waste_kg.sql  # estimated_waste_kg REAL on reports (now in schema.sql baseline too)
│   │   └── queries/             # Raw asyncpg parameterized SQL — NO ORM
│   │       ├── users.py         # get_user_by_email, get_user_by_id, create_user, update_user_profile()
│   │       ├── reports.py       # create_report, get_reports (role-filtered), get_reports_by_user, get_report_by_id, update_report_status, approve_report, soft_delete_report, hard_delete_report
│   │       ├── rewards.py       # get_user_points, get_transactions_by_user, create_reward_transaction
│   │       ├── schedule.py      # get_schedules, create_schedule, update_schedule_status, delete_schedule
│   │       ├── feedback.py      # create_feedback, get_feedback_by_user, get_all_feedback, respond_to_feedback
│   │       ├── organic.py       # Listings: create_listing, get_listings, get_listing_by_id, close_listing; Requests: create_request, get_all_requests, get_requests_by_user, get_request_by_id, has_pending_request, approve_request_atomic, update_request_status; Legacy: get_claims_by_user, claim_organic_waste_atomic
│   │       └── stats.py         # get_impact_summary, get_daily_report_stats, get_zone_performance, get_platform_totals
│   ├── ml/
│   │   ├── predictor.py         # analyze_waste_image(base64) → AnalysisResult; routes local model / cloud API / fallback
│   │   ├── local_model.py       # MobileNetV2 dual-head inference on weights/greenvision.pt
│   │   ├── weights/             # Saved weights (greenvision.pt)
│   │   └── training/            # PyTorch MobileNetV2 dual-head training pipeline & dataset
│   ├── routers/
│   │   ├── auth.py              # POST /signup/resident, /signup/admin, /login, /refresh; GET /me; PATCH /me
│   │   ├── reports.py           # POST /, GET /, GET /{id}, POST /{id}/approve, POST /{id}/reject, PATCH /{id}/status, DELETE /{id} (soft)
│   │   ├── rewards.py           # GET /summary, GET /history, POST /redeem
│   │   ├── schedule.py          # GET /, POST /, PATCH /{id}, DELETE /{id}
│   │   ├── feedback.py          # POST /, GET /, POST /{id}/respond
│   │   ├── organic.py           # Legacy: GET /, POST /, PATCH /{id}; Listings: GET /listings, POST /listings; Requests: GET /requests, POST /listings/{id}/request, PATCH /requests/{id}
│   │   └── stats.py             # GET /impact, /daily, /zones, /platform (public, no auth)
│   └── schemas/
│       └── models.py            # All Pydantic v2 request/response models
│
├── docker-compose.yml           # frontend + backend services
└── ai.md                        # This file
```

---

## Database

- **Engine:** Supabase Postgres via raw `asyncpg`. NO SQLAlchemy/ORM.
- **Pool:** Singleton in `backend/db/pool.py`, initialized in FastAPI lifespan. Also runs `ALTER TABLE` for `hidden_for` and `estimated_waste_kg` on startup.
- **Connection string:** `DATABASE_URL` in `.env` (asyncpg DSN).

### Schema Setup Order

1. Run `backend/db/schema.sql` (base tables)
2. Run `backend/db/migrations/001_kpi_views.sql` (SQL views)
3. Run `backend/db/migrations/002_soft_delete_and_organic.sql` (soft-delete + organic marketplace + profile_image)
4. Run `backend/db/migrations/003_add_estimated_waste_kg.sql` (if schema.sql didn't include it yet)
5. The pool's `init_pool()` also applies 002 & 003 ALTERs on startup as safety net.

### Tables

| Table | Key Columns |
|---|---|
| `users` | `id, name, email, password_hash, phone, role (admin/resident), address, profile_image, created_at` |
| `reports` | `id, user_id, image_base64, location_text, lat/lng, waste_type, fill_level, severity_score, environmental_impact_score, priority_level, recommended_action, estimated_waste_kg, status, hidden_for, created_at, updated_at` |
| `collection_schedule` | `id, zone_name, waste_type, collection_date, status (scheduled/completed/delayed), created_by` |
| `reward_transactions` | `id, user_id, report_id, points, type (earned/redeemed), description, created_at` |
| `organic_waste_listings` | `id, posted_by, total_kg, available_kg, description, waste_type, pickup_location, available_until, image_base64, status (open/closed), created_at` |
| `organic_waste_requests` | `id, listing_id, user_id, requested_kg, contact_info, status (pending/approved/rejected/completed), admin_note, created_at, updated_at` |
| `organic_waste_records` | Legacy farm distribution log — `id, report_id, quantity_kg, distributed_to, distribution_date, status` |
| `organic_waste_claims` | Legacy claim log — kept for backwards compat, no new UI writes here |
| `feedback` | `id, user_id, subject, message, status (open/in_progress/resolved), admin_response, created_at, updated_at` |

### SQL Views (001_kpi_views.sql)

| View | Purpose |
|---|---|
| `daily_report_stats` | Daily aggregates by waste_type/priority/status → feeds trend charts |
| `zone_performance` | Completion rate per zone → feeds zone leaderboard |
| `impact_summary` | Weekly environmental impact + points + organic kg → feeds landing KPIs |
| `user_activity_rank` | Resident leaderboard by earned points (future use) |

---

## Report Soft-Delete System

`hidden_for` column on `reports`:

| Value | Visible to |
|---|---|
| `NULL` | Everyone |
| `'admin'` | Residents only |
| `'resident'` | Admins only |
| `'both'` | Nobody |

- `GET /api/reports` filters using `viewer_role` — excludes records where `hidden_for = viewer_role` or `'both'`.
- No permanent deletion via UI. `hard_delete_report()` exists in queries but is NOT exposed via any router.
- **Admin UI:** EyeOff button → hides from admin view only.
- **Resident UI:** EyeOff button → hides from resident view only.

---

## Organic Marketplace Flow

### Admin
1. Post listing (description, kg, waste_type, pickup_location, available_until, optional image).
2. View all resident requests in "Resident Request Management" panel.
3. Approve → atomic `FOR UPDATE` lock decrements `available_kg`; listing closes if 0 remains.
4. Reject or Mark Completed → `update_request_status()`.

### Resident
1. Browse listing cards (availability progress bar).
2. Click "Request" → enter requested_kg (validated ≤ available_kg) + contact_info.
3. Duplicate prevention: `has_pending_request()` — one active request per listing per user.
4. Track own requests in "My Compost Requests" table with live status.

---

## AI / ML Layer

- **File:** `backend/ml/predictor.py`
- **Entry point:** `analyze_waste_image(image_base64: str) -> AnalysisResult`
- **Routing:** Controlled by `USE_LOCAL_MODEL` in `.env`:
  - `USE_LOCAL_MODEL=true`: Runs local MobileNetV2 dual-head classifier (`backend/ml/weights/greenvision.pt`)
  - `USE_LOCAL_MODEL=false`: Runs cloud vision API via `VISION_KEY`
  - Fallback: Deterministic heuristic (`_fallback_inference()`) if both paths fail/unavailable
- **Server-side computed:** `severity_score (1–10), environmental_impact_score (10–100), priority_level` — via `_calculate_scores_from_weight()` (deterministic, based on kg + waste_type + fill_level)
- **Source field:** `AnalysisResult.source = "local"`, `"cloud"`, or `"fallback"` — logged but not stored in DB.
- **Sanitisers:** `_sanitize_waste_type()` and `_sanitize_fill_level()` normalise free-text output to standard enums.

---

## Auth

- JWT issued by FastAPI via `python-jose`. Access token: 60 min. Refresh token: 30 days.
- `generate_tokens(user_id, email, role, name)` → `{accessToken, refreshToken}`.
- Protected routes use `Depends(get_current_user)` → returns JWT payload dict with `sub, email, role, name`.
- Admin-only routes use `Depends(require_admin)` → raises 403 if `role != 'admin'`.
- Emails normalized (strip + lowercase) on signup and login.
- Frontend stores tokens in `localStorage` as `gv_access_token`, `gv_refresh_token`, `gv_user`.
- `axios` interceptor attaches `Authorization: Bearer <token>` to every request.
- On 401 response: localStorage cleared, redirect to `/login` (except auth routes and `/auth/me` init check).
- **Roles:** `admin` (municipal operator), `resident`.

---

## Frontend Architecture

- **Framework:** React 19 + Vite + TypeScript + Tailwind v4
- **State:** `@tanstack/react-query` v5 — `staleTime: 30s`, `refetchOnWindowFocus: false`, `retry: 1`
- **Routing:** `react-router-dom` v7 — `BrowserRouter`. All routes in `App.tsx`.
- **Toasts:** `react-hot-toast` — custom dark theme (slate-950 bg).
- **Icons:** `lucide-react`
- **Animations:** `motion` (framer-motion successor)
- **Design:** dark theme (`bg-slate-950`), emerald/teal/cyan accent palette, Inter body font, Poppins headings

### Route Map

| Path | Component | Auth |
|---|---|---|
| `/` | LandingPage | Public |
| `/login` | LoginPage | Public |
| `/signup/resident` | ResidentSignupPage | Public |
| `/signup/admin` | AdminSignupPage | Public |
| `/dashboard` | DashboardPage → AdminDashboard or ResidentDashboard | Protected |
| `/reports/new` | ReportFlowPage | Protected |
| `/schedule` | SchedulePage | Protected |
| `/rewards` | RewardsPage | Resident |
| `/organic` | OrganicWastePage | Protected |
| `/feedback` | FeedbackPage | Protected |
| `/profile` | ProfilePage | Protected |

### API Endpoints (all under `/api`)

| Router | Key Endpoints |
|---|---|
| `/auth` | POST /signup/resident, /signup/admin, /login, /refresh; GET /me; PATCH /me |
| `/reports` | POST /, GET /, GET /{id}, POST /{id}/approve, POST /{id}/reject, PATCH /{id}/status, DELETE /{id} |
| `/rewards` | GET /summary, /history; POST /redeem |
| `/schedule` | GET /, POST /, PATCH /{id}, DELETE /{id} |
| `/feedback` | POST /, GET /, POST /{id}/respond |
| `/organic` | Legacy: GET /, POST /, PATCH /{record_id}; Listings: GET /listings, POST /listings; Requests: GET /requests, POST /listings/{id}/request, PATCH /requests/{id} |
| `/stats` | GET /impact, /daily, /zones, /platform (no auth) |

---

## Profile Page

- Route: `/profile` (both roles)
- Avatar: base64 upload (max 2 MB), shown in Navbar immediately after save
- Editable: name, phone, address
- Read-only: email, role, account ID, member since
- Stats row: total reports, approved, pending, eco-points (residents) / collected (admin)
- Backend: `PATCH /api/auth/me` → `update_user_profile()` → `UpdateProfileRequest`

---

## Form Input Types (enforced)

| Field | Input type |
|---|---|
| email | `type="email"` |
| password | `type="password"` |
| phone | `type="tel"` |
| collection_date | `type="datetime-local"` |
| available_until | `type="datetime-local"` |
| quantity_kg / total_kg / requested_kg | `type="number" min>0 step=0.1` |
| waste_type / status / priority | `<select>` with exact enum values |

---

## Key Gotchas & Conventions

1. **IDs are string-based timestamps** (`rep-<hex ms>`, `u-res-<hex>`, `lst-<hex>`, `req-<hex>`, etc.) — not UUIDs.
2. **No ORM** — all DB access via raw asyncpg parameterized queries in `db/queries/`.
3. **Scores are server-side** — Vision models return `waste_type, fill_level, estimated_waste_kg, recommended_action`. Severity/impact/priority are computed deterministically from `estimated_waste_kg` via `_calculate_scores_from_weight()`.
4. **pool.py runs ALTER TABLE** on startup — safe to re-run (uses `IF NOT EXISTS`).
5. **`get_settings()` is lru_cached** — config is read once; mutating env after startup has no effect.
6. **Soft-delete not hard-delete** — the `DELETE /api/reports/{id}` endpoint is a soft-delete. `hard_delete_report()` exists but is not routed.
7. **Legacy organic tables** — `organic_waste_claims` and `organic_waste_records` kept for backwards compat; no new UI creates claims. New flow uses `organic_waste_requests`.
9. **console.log in client.ts** — both request and response are logged to console. Remove for production.
10. **Predictor routing** — `backend/ml/predictor.py` seamlessly handles local `greenvision.pt` or cloud vision inference.

---

## Environment Variables (`.env`)

| Variable | Description |
|---|---|
| `VISION_KEY` | Cloud Vision API key |
| `USE_LOCAL_MODEL` | Set `true` to use local `greenvision.pt` MobileNetV2 model |
| `DATABASE_URL` | asyncpg DSN: `postgresql://user:pass@host:port/db` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase publishable key |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `APP_URL` | Backend URL (default: `http://localhost:8000`) |
| `ENVIRONMENT` | `development` or `production` |
