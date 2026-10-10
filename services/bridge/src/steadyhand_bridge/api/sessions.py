"""Session trial logging and export endpoints conforming to contracts Section 8."""

from typing import List, Dict, Any
from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel
from ..contracts import SessionTaskEvent
from ..auth import verify_bearer_token
from ..sessions.export import export_session_summary

router = APIRouter(prefix="/v1/sessions", tags=["sessions"])


class EventsPayload(BaseModel):
    events: List[SessionTaskEvent]


@router.post("")
async def create_session(request: Request) -> dict:
    state = request.app.state
    verify_bearer_token(
        request.headers.get("Authorization"),
        expected_token=state.config.auth_token,
    )
    session_id = state.sessions.create_session()
    return {"v": 1, "session_id": session_id}


@router.post("/{session_id}/events")
async def log_session_events(session_id: str, payload: EventsPayload, request: Request) -> dict:
    state = request.app.state
    verify_bearer_token(
        request.headers.get("Authorization"),
        expected_token=state.config.auth_token,
    )
    try:
        accepted_ids = state.sessions.add_events(session_id, payload.events)
        return {"v": 1, "session_id": session_id, "accepted_event_ids": accepted_ids}
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session not found: {session_id}",
        )


@router.get("/{session_id}/export")
async def export_session(session_id: str, request: Request) -> dict:
    state = request.app.state
    verify_bearer_token(
        request.headers.get("Authorization"),
        expected_token=state.config.auth_token,
    )
    try:
        summary = export_session_summary(state.sessions, session_id)
        return summary
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session not found: {session_id}",
        )
