"""In-memory sliding window rate limiter for FastAPI routes.

Provides lightweight, robust rate limiting without requiring external Redis
dependencies. Safely extracts client IP (including X-Forwarded-For when
behind Render/Nginx reverse proxies).
"""

import time
from collections import defaultdict
from typing import Optional
from fastapi import Request, HTTPException, status
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """Sliding-window in-memory rate limiter."""

    def __init__(self, requests_per_minute: int = 60, burst_limit: Optional[int] = None):
        self.rpm = requests_per_minute
        self.window_seconds = 60
        self.burst_limit = burst_limit or requests_per_minute
        self._history: dict[str, list[float]] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        # Check standard reverse proxy headers
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # First IP in the comma-separated chain is the client
            return forwarded_for.split(",")[0].strip()
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        if request.client and request.client.host:
            return request.client.host
        return "127.0.0.1"

    def __call__(self, request: Request) -> None:
        client_ip = self._get_client_ip(request)
        now = time.time()
        window_start = now - self.window_seconds

        # Clean timestamps older than the sliding window
        recent = [t for t in self._history[client_ip] if t > window_start]
        self._history[client_ip] = recent

        if len(recent) >= self.rpm:
            retry_after = max(1, int(self.window_seconds - (now - recent[0])))
            logger.warning(
                "[RateLimit] Client IP %s exceeded limit (%d req/min) on %s %s",
                client_ip, self.rpm, request.method, request.url.path,
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Please retry in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )

        self._history[client_ip].append(now)


# Pre-configured limiters for critical application paths
auth_limiter = RateLimiter(requests_per_minute=10)       # 10 attempts/min for login & signup
report_limiter = RateLimiter(requests_per_minute=20)     # 20 image uploads/min per client
api_general_limiter = RateLimiter(requests_per_minute=120) # 120 req/min for general reads

