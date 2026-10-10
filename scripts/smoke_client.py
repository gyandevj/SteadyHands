#!/usr/bin/env python3
"""End-to-end client smoke check testing HTTP and WebSocket stream."""

import asyncio
import json
import sys
import httpx
import websockets

BASE_URL = "http://127.0.0.1:8765"
WS_URL = "ws://127.0.0.1:8765/v1/stream"
AUTH_TOKEN = "steadyhand-dev-token-secret"


async def main():
    print("=== SteadyHand End-to-End Stream Smoke Check ===")

    # 1. Check /health
    print("[1/4] Checking GET /health...")
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{BASE_URL}/health")
        assert resp.status_code == 200, f"/health failed: {resp.status_code}"
        data = resp.json()
        assert data["status"] == "ok"
        print(f"  [OK] /health response: {data}")

    # 2. Check /v1/device
    print("[2/4] Checking GET /v1/device...")
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        resp = await client.get(f"{BASE_URL}/v1/device", headers=headers)
        assert resp.status_code == 200, f"/v1/device failed: {resp.status_code}"
        data = resp.json()
        assert data["source"] in ("synthetic", "live", "recorded")
        print(f"  [OK] /v1/device response: source={data['source']}, model={data['hello']['sensor']['model']}")

    # 3. Connect to WebSocket /v1/stream
    print("[3/4] Connecting to WebSocket /v1/stream and authenticating...")
    async with websockets.connect(WS_URL, origin="http://localhost:3000") as ws:
        # Send auth frame
        auth_msg = {
            "v": 1,
            "type": "client.auth",
            "request_id": "smoke-auth-1",
            "token": AUTH_TOKEN,
            "role": "extension",
        }
        await ws.send(json.dumps(auth_msg))

        # Expect state.snapshot
        snap_raw = await asyncio.wait_for(ws.recv(), timeout=4.0)
        snapshot = json.loads(snap_raw)
        assert snapshot["type"] == "state.snapshot", f"Expected state.snapshot, got {snapshot}"
        print(f"  [OK] Received state.snapshot: health is_stale={snapshot['health']['is_stale']}")

        # Ping / pong check
        ping_msg = {
            "v": 1,
            "type": "client.ping",
            "request_id": "smoke-ping-1",
            "timestamp_ms": 1000,
        }
        await ws.send(json.dumps(ping_msg))
        pong_raw = await asyncio.wait_for(ws.recv(), timeout=4.0)
        pong = json.loads(pong_raw)
        assert pong["type"] == "server.pong", f"Expected server.pong, got {pong}"
        print(f"  [OK] Received server.pong: request_id={pong['request_id']}")

        # 4. Await streaming motion frame
        print("[4/4] Awaiting streaming motion.frame...")
        frame_received = False
        start_wait = asyncio.get_event_loop().time()

        while (asyncio.get_event_loop().time() - start_wait) < 5.0:
            msg_raw = await asyncio.wait_for(ws.recv(), timeout=3.0)
            msg = json.loads(msg_raw)
            if msg.get("type") == "motion.frame":
                print(f"  [OK] Received motion.frame: frame_seq={msg['frame_seq']}, quality={msg['quality']['state']}, motion={msg['motion']['status']}, dominant_hz={msg['motion']['dominant_hz']}, rec={msg['recommendation']}")
                frame_received = True
                break

        assert frame_received, "Failed to receive motion.frame within timeout"

    print("=== End-to-End Smoke Check PASSED! ===")


if __name__ == "__main__":
    asyncio.run(main())
