"""HTTP and WebSocket stream lifecycle tests."""

import pytest
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from steadyhand_bridge.main import create_app
from steadyhand_bridge.config import BridgeConfig


@pytest.fixture
def test_app():
    cfg = BridgeConfig(
        host="127.0.0.1",
        port=8765,
        mode="mock",
        auth_token="test-secret-token",
        allowed_origins=["http://localhost:3000"],
    )
    return create_app(cfg)


def test_health_endpoint_public(test_app):
    with TestClient(test_app) as client:
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["service"] == "steadyhand-bridge"
        assert "auth_token" not in data


def test_device_endpoint_auth(test_app):
    with TestClient(test_app) as client:
        # Unauthorized without token
        resp = client.get("/v1/device")
        assert resp.status_code == 401

        # Forbidden with wrong token
        resp = client.get("/v1/device", headers={"Authorization": "Bearer wrong-token"})
        assert resp.status_code == 403

        # Success with correct token
        resp = client.get("/v1/device", headers={"Authorization": "Bearer test-secret-token"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["v"] == 1
        assert data["source"] == "synthetic"
        assert data["hello"]["type"] == "device.hello"


def test_websocket_auth_flow(test_app):
    with TestClient(test_app) as client:
        # Connect to stream
        with client.websocket_connect("/v1/stream", headers={"Origin": "http://localhost:3000"}) as ws:
            # Send valid client.auth
            ws.send_json({
                "v": 1,
                "type": "client.auth",
                "request_id": "auth-1",
                "token": "test-secret-token",
                "role": "extension",
            })

            # First response must be state.snapshot
            snapshot = ws.receive_json()
            assert snapshot["type"] == "state.snapshot"
            assert "health" in snapshot
            assert snapshot["device"]["type"] == "device.hello"

            # Test ping/pong
            ws.send_json({
                "v": 1,
                "type": "client.ping",
                "request_id": "ping-1",
                "timestamp_ms": 12345,
            })
            pong = ws.receive_json()
            assert pong["type"] == "server.pong"
            assert pong["request_id"] == "ping-1"


def test_websocket_bad_token_rejected(test_app):
    with TestClient(test_app) as client:
        with client.websocket_connect("/v1/stream", headers={"Origin": "http://localhost:3000"}) as ws:
            ws.send_json({
                "v": 1,
                "type": "client.auth",
                "request_id": "auth-bad",
                "token": "bad-token",
            })
            # Error frame sent before close
            msg = ws.receive_json()
            assert msg["type"] == "command.error"
            assert msg["code"] == "invalid_token"


def test_websocket_disallowed_origin_rejected(test_app):
    with TestClient(test_app) as client:
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect("/v1/stream", headers={"Origin": "http://malicious-site.com"}):
                pass
