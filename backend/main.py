"""FastAPI main application entry point."""
# GreenVision AI FastAPI backend
from contextlib import asynccontextmanager
import asyncio
import time
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from db.pool import init_pool, close_pool, get_pool
from routers import auth, reports, rewards, schedule, feedback, organic, stats


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
    await init_pool()
    task = asyncio.create_task(_organic_expiry_loop())
    try:
        yield
    finally:
        task.cancel()
        await close_pool()


app = FastAPI(
    title="GreenVision AI API",
    description="Municipal waste monitoring and AI dispatch system",
    version="2.0.0",
    lifespan=lifespan,
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    logger.info(f"Incoming request: {request.method} {request.url.path}")
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"Completed request: {request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.4f}s")
    return response

# ---------------------------------------------------------------------------
# CORS — frontend dev server + production domain
# ---------------------------------------------------------------------------
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.get("/health")
async def health():
    return {"status": "ok", "service": "GreenVision AI Backend"}
