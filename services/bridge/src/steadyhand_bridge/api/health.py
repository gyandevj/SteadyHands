"""Health endpoint reporting basic service status without sensitive data."""

import time
from fastapi import APIRouter
from ..version import __version__, API_VERSION

router = APIRouter(tags=["health"])
_start_time = time.monotonic()


@router.get("/health")
async def get_health() -> dict:
    """Public health endpoint. No token required. Contains zero sensitive data."""
    uptime = round(time.monotonic() - _start_time, 2)
    return {
        "status": "ok",
        "service": "steadyhand-bridge",
        "version": __version__,
        "api_version": API_VERSION,
        "uptime_s": uptime,
    }
