"""FastAPI main application entry point."""
# GreenVision AI FastAPI backend
from contextlib import asynccontextmanager
import asyncio
import time
import logging
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from db.pool import init_pool, close_pool, get_pool
from routers import auth, reports, rewards, schedule, feedback, organic, stats
from core.config import get_settings


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


async def _organic_expiry_loop() -> None:
    """Background task: auto-close organic listings whose available_until has passed. Runs hourly."""
    from db.queries.organic import expire_old_listings
    while True:
        await asyncio.sleep(3600)  # wait 1 hour between runs
        try:
            pool = get_pool()
            async with pool.acquire() as conn:
                closed = await expire_old_listings(conn)
                if closed:
                    logger.info("[OrganicExpiry] Auto-closed %d expired listings.", closed)
        except Exception as exc:
            logger.warning("[OrganicExpiry] Background task error: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise DB pool on startup, close on shutdown."""
    settings = get_settings()
    logger.info("[Startup] GreenVision AI Backend starting (env=%s)", settings.environment)
    await init_pool()
    task = asyncio.create_task(_organic_expiry_loop())
    logger.info("[Startup] Background tasks started. Ready to serve requests.")
    try:
        yield
    finally:
        logger.info("[Shutdown] Shutting down GreenVision AI Backend...")
        task.cancel()
        await close_pool()
        logger.info("[Shutdown] Database pool closed. Goodbye.")


settings = get_settings()

app = FastAPI(
    title="GreenVision AI API",
    description="Municipal waste monitoring and AI dispatch system",
    version="2.0.0",
    lifespan=lifespan,
    # Hide API docs in production
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
)


# ---------------------------------------------------------------------------
# Global Exception Handler (Never leak stack traces or internal DB info)
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error("[UnhandledException] %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal server error occurred. Please try again later."},
    )


# ---------------------------------------------------------------------------
# Security Headers Middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # CSP: allow same-origin + API calls + Google fonts
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: blob:; "
        "connect-src 'self';"
    )
    return response


# ---------------------------------------------------------------------------
# Request Logging Middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    logger.info("Incoming request: %s %s", request.method, request.url.path)
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(
        "Completed: %s %s → %d (%.4fs)",
        request.method, request.url.path, response.status_code, process_time,
    )
    # Expose server timing header for debugging
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    return response


# ---------------------------------------------------------------------------
# CORS — read allowed origins from env; fallback to dev origins
# ---------------------------------------------------------------------------
_raw_origins = settings.allowed_origins if settings.allowed_origins else ""
ALLOWED_ORIGINS = (
    [o.strip() for o in _raw_origins.split(",") if o.strip()]
    if _raw_origins
    else [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
API_PREFIX = "/api"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(reports.router, prefix=API_PREFIX)
app.include_router(rewards.router, prefix=API_PREFIX)
app.include_router(schedule.router, prefix=API_PREFIX)
app.include_router(feedback.router, prefix=API_PREFIX)
app.include_router(organic.router, prefix=API_PREFIX)
app.include_router(stats.router, prefix=API_PREFIX)


# ---------------------------------------------------------------------------
# Health check endpoints — both /health and /api/health probe DB connectivity
# ---------------------------------------------------------------------------
@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Health check endpoint with database connectivity probe."""
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return {"status": "ok", "database": "connected", "service": "GreenVision AI Backend"}
    except Exception as exc:
        logger.error("[HealthCheck] DB probe failed: %s", exc)
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "database": "unreachable", "detail": "Database connection unavailable"},
        )
