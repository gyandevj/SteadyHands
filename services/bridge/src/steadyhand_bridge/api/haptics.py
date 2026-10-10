"""Haptic control endpoints conforming to contracts Section 10."""

from fastapi import APIRouter, Request, HTTPException, status
from ..contracts import HapticRequest
from ..auth import verify_bearer_token

router = APIRouter(prefix="/v1", tags=["haptics"])


@router.post("/haptics")
async def trigger_haptic(payload: HapticRequest, request: Request) -> dict:
    state = request.app.state
    verify_bearer_token(
        request.headers.get("Authorization"),
        expected_token=state.config.auth_token,
    )

    ack, pulse = state.haptics.request_pulse(payload)

    if pulse:
        # Register pulse with analysis runner for blanking window
        state.analysis.record_haptic_pulse(pulse.mcu_end_us)

    if not ack.accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ack.reason or "Haptic request rejected",
        )

    return ack.model_dump()
