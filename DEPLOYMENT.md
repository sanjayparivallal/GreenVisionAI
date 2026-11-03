# GreenVision AI — Deployment Guide

> **Production deployment for both Render.com (recommended) and Docker Compose (self-hosted).**

---

## 🚀 Option A: Deploy to Render (Recommended)

### Prerequisites
- A [Render](https://render.com) account
- A live PostgreSQL database (Supabase, Render Postgres, or Neon)
- A Google Gemini API key (for cloud AI inference)

### Steps

#### 1. Fork / connect your repository
Connect your GitHub repo (`GreenVisionAI` or the StartupFair repo) to Render.

#### 2. Create the Backend Web Service
| Setting | Value |
|---|---|
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1` |
| **Health Check Path** | `/health` |
| **Region** | Singapore (closest to India) |

#### 3. Set Environment Variables (Backend)
In the Render dashboard → **Environment** tab for the backend service:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/greenvision` |
| `JWT_SECRET` | Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `JWT_REFRESH_SECRET` | Generate another random 32-byte hex |
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `ENVIRONMENT` | `production` |
| `ALLOWED_ORIGINS` | `https://greenvision-frontend.onrender.com` (your frontend URL) |
| `APP_URL` | `https://greenvision-backend.onrender.com` (your backend URL) |
| `USE_LOCAL_MODEL` | `false` |

#### 4. Create the Frontend Static Site
| Setting | Value |
|---|---|
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

Set the environment variable:
- `VITE_API_URL` = `/api`

#### 5. Configure Rewrite Rules (Frontend)
Add a rewrite rule in Render → **Redirects/Rewrites**:
- **Source**: `/api/*`
- **Destination**: `https://greenvision-backend.onrender.com/api/$1`
- **Type**: Rewrite

Add SPA fallback:
- **Source**: `/*`
- **Destination**: `/index.html`
- **Type**: Rewrite

#### 6. Set up the Database
Run the schema + migrations against your Postgres database:
```sql
-- Run in order:
backend/db/schema.sql
backend/db/migrations/001_kpi_views.sql
backend/db/migrations/002_soft_delete_and_organic.sql
backend/db/migrations/003_add_estimated_waste_kg.sql
backend/db/migrations/004_indexes_and_schedule_ts.sql
backend/db/migrations/005_priority_indexes.sql
```
> **Note:** Migrations 001–005 use `CREATE INDEX IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — they are safe to run on an existing DB.

#### 7. Deploy
Trigger a manual deploy on Render or push to your main branch.

---

## 🐳 Option B: Docker Compose (Self-Hosted)

### Prerequisites
- Docker Desktop (Windows/Mac) or Docker Engine + Compose (Linux)
- At minimum 2 GB RAM

### Steps

#### 1. Clone and configure
```bash
git clone https://github.com/sanjayparivallal/GreenVisionAI.git
cd GreenVision-AI-main
```

Copy the example env file:
```bash
cp .env.example backend/.env
```

Edit `backend/.env` with your values (at minimum `JWT_SECRET`, `JWT_REFRESH_SECRET`, and either `DATABASE_URL` or the `POSTGRES_*` vars).

#### 2. Build and start
```bash
docker compose up --build -d
```

Services:
- Frontend: http://localhost:80
- Backend API: http://localhost:8000
- Health check: http://localhost:8000/health

#### 3. Stop
```bash
docker compose down
```

To remove all data volumes:
```bash
docker compose down -v
```

---

## 🔑 Security Checklist Before Going Live

- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are strong random values (≥ 32 chars)
- [ ] `ENVIRONMENT=production` is set on backend
- [ ] `ALLOWED_ORIGINS` is set to exact frontend URL (no trailing slash)
- [ ] `.env` files are in `.gitignore` and NOT committed
- [ ] `GEMINI_API_KEY` is set and valid
- [ ] Database URL uses SSL (`?ssl=require` suffix for Supabase/Render Postgres)
- [ ] Health check at `/health` returns `{"status": "ok"}`
- [ ] API docs disabled in production (no `/docs` or `/redoc` endpoints)

---

## 📊 Health Checks

| Endpoint | Expected Response |
|---|---|
| `GET /health` | `{"status": "ok", "service": "GreenVision AI Backend"}` |
| `GET /api/health` | `{"status": "ok", "database": "connected", ...}` |

---

## 👥 Team

| Name | Reg No |
|---|---|
| Sanjay C P | 61782323106096 |
| Ranjini P | 61782323106096 |
| Saniya Gayathri S | 61782323106094 |

**Institution:** SONA College of Technology, Salem  
**Project:** GreenVision AI — Municipal Waste Monitoring System
