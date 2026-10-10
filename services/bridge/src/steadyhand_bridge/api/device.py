"""Device status and capabilities endpoint."""

from fastapi import APIRouter, Depends, Request
from ..contracts import DeviceHello, DeviceHealth
from ..auth import verify_bearer_token

router = APIRouter(prefix="/v1", tags=["device"])


@router.get("/device")
async def get_device_info(request: Request) -> dict:
    """Return latest source, hello, health, and capabilities."""
    state = request.app.state
    # Verify bearer token
    verify_bearer_token(
        request.headers.get("Authorization"),
        expected_token=state.config.auth_token,
    )

    hello: DeviceHello = state.adapter.get_hello()
    health: DeviceHealth = state.acquisition.get_health(state.adapter.source)

    return {
        "v": 1,
        "source": state.adapter.source,
        "hello": hello.model_dump(),
        "health": health.model_dump(),
        "capabilities": hello.capabilities.model_dump(),
    }
