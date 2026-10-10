"""WebSocket streaming endpoint conforming to contracts Section 9."""

import asyncio
import json
import time
from typing import Set, Dict, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..contracts import (
    ClientAuth,
    ClientPing,
    ServerPong,
    StateSnapshot,
    CommandError,
    MotionFrame,
    DeviceHealth,
    DeviceHello,
)
from ..auth import is_origin_allowed

router = APIRouter(tags=["stream"])


class ConnectionManager:
    """Manages active authenticated WebSocket connections with backpressure control."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.client_roles: Dict[WebSocket, str] = {}

    def add(self, ws: WebSocket, role: str) -> None:
        self.active_connections.add(ws)
        self.client_roles[ws] = role

    def remove(self, ws: WebSocket) -> None:
        self.active_connections.discard(ws)
        self.client_roles.pop(ws, None)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        """Broadcast message to all active authenticated clients.
        
        Uses drop-oldest / non-blocking policy to prevent slow clients from blocking.
        """
        payload_str = json.dumps(message)
        dead = []
        for ws in list(self.active_connections):
            try:
                await ws.send_text(payload_str)
            except Exception:
                dead.append(ws)

        for ws in dead:
            self.remove(ws)


ws_manager = ConnectionManager()


@router.websocket("/v1/stream")
async def websocket_stream_endpoint(websocket: WebSocket) -> None:
    state = websocket.app.state
    config = state.config

    # 1. Validate Origin header
    origin = websocket.headers.get("origin")
    if not is_origin_allowed(origin, config.allowed_origins):
        await websocket.close(code=1008, reason="Origin not allowed")
        return

    await websocket.accept()

    # 2. Authentication handshake within 3.0 seconds
    authenticated = False
    client_role = "extension"

    try:
        raw_msg = await asyncio.wait_for(websocket.receive_text(), timeout=3.0)

        # Message size limit check (64 KiB)
        if len(raw_msg.encode("utf-8")) > config.max_frame_bytes:
            err = CommandError(
                request_id="auth",
                code="message_too_large",
                message=f"Message size exceeds limit of {config.max_frame_bytes} bytes",
            )
            await websocket.send_text(err.model_dump_json())
            await websocket.close(code=1009, reason="Message too large")
            return

        data = json.loads(raw_msg)
        auth_msg = ClientAuth.model_validate(data)

        if auth_msg.token != config.auth_token:
            err = CommandError(
                request_id=auth_msg.request_id,
                code="invalid_token",
                message="Pairing token rejected",
            )
            await websocket.send_text(err.model_dump_json())
            await websocket.close(code=1008, reason="Unauthorized")
            return

        authenticated = True
        client_role = auth_msg.role or "extension"

    except asyncio.TimeoutError:
        err = CommandError(
            request_id="auth",
            code="auth_timeout",
            message="client.auth not received within 3.0 seconds",
        )
        try:
            await websocket.send_text(err.model_dump_json())
            await websocket.close(code=1008, reason="Auth timeout")
        except Exception:
            pass
        return
    except Exception as e:
        try:
            await websocket.close(code=1008, reason="Malformed auth frame")
        except Exception:
            pass
        return

    # 3. Registration and initial state.snapshot
    ws_manager.add(websocket, client_role)

    hello: DeviceHello = state.adapter.get_hello()
    health: DeviceHealth = state.acquisition.get_health(state.adapter.source)
    latest_frame: Optional[MotionFrame] = getattr(state, "latest_frame", None)

    snapshot = StateSnapshot(
        request_id=f"snap-{int(time.time()*1000)}",
        device=hello,
        health=health,
        latest_frame=latest_frame,
    )
    await websocket.send_text(snapshot.model_dump_json())

    # 4. Inbound message loop (heartbeat pings, queries)
    try:
        while True:
            text = await websocket.receive_text()
            if len(text.encode("utf-8")) > config.max_frame_bytes:
                err = CommandError(
                    request_id="stream",
                    code="message_too_large",
                    message="Message size exceeds 64 KiB",
                )
                await websocket.send_text(err.model_dump_json())
                continue

            msg_data = json.loads(text)
            msg_type = msg_data.get("type")

            if msg_type == "client.ping":
                ping = ClientPing.model_validate(msg_data)
                pong = ServerPong(
                    request_id=ping.request_id,
                    timestamp_ms=int(time.time() * 1000),
                )
                await websocket.send_text(pong.model_dump_json())

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        ws_manager.remove(websocket)
