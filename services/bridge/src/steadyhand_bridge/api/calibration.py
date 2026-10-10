"""Calibration endpoints conforming to contracts Section 8."""

from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel, Field
from ..auth import verify_bearer_token

router = APIRouter(prefix="/v1/calibration", tags=["calibration"])


class CalibrationStartRequest(BaseModel):
    phase: str = Field(default="stationary")
    request_id: str = Field(min_length=1)


class CalibrationFinishRequest(BaseModel):
    request_id: str = Field(min_length=1)


@router.post("/start")
async def start_calibration(payload: CalibrationStartRequest, request: Request) -> dict:
    state = request.app.state
    verify_bearer_token(
        request.headers.get("Authorization"),
        expected_token=state.config.auth_token,
    )

    session_id = state.calibration.start_session(
        phase=payload.phase,
        request_id=payload.request_id,
    )
    return {
        "v": 1,
        "session_id": session_id,
        "phase": payload.phase,
        "request_id": payload.request_id,
    }


@router.get("/{session_id}")
async def get_calibration_state(session_id: str, request: Request) -> dict:
    state = request.app.state
    verify_bearer_token(
        request.headers.get("Authorization"),
        expected_token=state.config.auth_token,
    )

    calib_state = state.calibration.get_state(session_id)
    if not calib_state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Calibration session not found: {session_id}",
        )
    return calib_state.model_dump()


@router.post("/{session_id}/finish")
async def finish_calibration(session_id: str, payload: CalibrationFinishRequest, request: Request) -> dict:
    state = request.app.state
    verify_bearer_token(
        request.headers.get("Authorization"),
        expected_token=state.config.auth_token,
    )

    try:
        result = state.calibration.finish_session(session_id)
        # Register calibration result with analysis runner
        state.analysis.set_calibration(result)
        return {
            "v": 1,
            "session_id": session_id,
            "request_id": payload.request_id,
            "result": result.model_dump(),
        }
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Calibration session not found: {session_id}",
        )
