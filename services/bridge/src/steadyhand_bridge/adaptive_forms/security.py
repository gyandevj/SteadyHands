"""Security, rate limiting, and concurrency guards for Adaptive Forms AI endpoint.

Prevents unauthorized access, upstream API stampedes, and excessive billing.
"""

import time
import asyncio
from typing import Dict, Optional, Set
from fastapi import Request, HTTPException, status


class SecurityManager:
    def __init__(
        self,
        pairing_token: Optional[str] = None,
        max_concurrent: int = 2,
        rate_limit_per_minute: int = 5,
        allowed_extension_origins: Optional[Set[str]] = None,
    ):
        self.pairing_token = pairing_token
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.rate_limit_per_minute = rate_limit_per_minute
        self.allowed_origins = allowed_extension_origins or set()
        self._request_timestamps: Dict[str, list[float]] = {}
        self._active_requests: Dict[str, asyncio.Future] = {}

    def verify_request(self, request: Request, provided_token: Optional[str] = None) -> None:
        """Verifies pairing token and origin."""
        # 1. Pairing token verification
        token = provided_token
        if not token:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header[7:].strip()
            elif "X-Adaptive-Forms-Token" in request.headers:
                token = request.headers.get("X-Adaptive-Forms-Token", "").strip()

        # If pairing token is set on the server, require matching token
        if self.pairing_token:
            if not token or token != self.pairing_token:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or missing Adaptive Forms pairing token",
                )

        # 2. Origin check (if configured and Origin header present)
        origin = request.headers.get("Origin")
        if origin and self.allowed_origins:
            if not any(origin.startswith(allowed) for allowed in self.allowed_origins):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Disallowed origin: {origin}",
                )

    def check_rate_limit(self, client_key: str = "default") -> None:
        """Enforces rate limiting (sliding 60-second window)."""
        now = time.monotonic()
        timestamps = self._request_timestamps.setdefault(client_key, [])
        # Prune older than 60s
        self._request_timestamps[client_key] = [t for t in timestamps if now - t < 60.0]
        timestamps = self._request_timestamps[client_key]

        if len(timestamps) >= self.rate_limit_per_minute:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: maximum {self.rate_limit_per_minute} requests per minute",
            )
        timestamps.append(now)
