"""Command-line entry point for steadyhand_bridge."""

import argparse
import sys
import uvicorn
from .config import BridgeConfig
from .main import create_app


def parse_args():
    parser = argparse.ArgumentParser(description="SteadyHand Bridge Service")
    parser.add_argument(
        "--mode",
        choices=["mock", "replay", "uno_q"],
        default="mock",
        help="Adapter operation mode (default: mock)",
    )
    parser.add_argument("--host", default="127.0.0.1", help="Host address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8765, help="Port (default: 8765)")
    parser.add_argument("--token", default=None, help="Pairing authentication token")
    parser.add_argument("--fixture", default=None, help="Path to replay fixture file")
    parser.add_argument("--device-port", default="COM3", help="UNO Q device port")
    parser.add_argument("--enable-haptics", action="store_true", help="Enable optional haptics")
    return parser.parse_args()


def main():
    args = parse_args()
    cfg = BridgeConfig.from_env()

    if args.mode:
        cfg.mode = args.mode
    if args.host:
        cfg.host = args.host
    if args.port:
        cfg.port = args.port
    if args.token:
        cfg.auth_token = args.token
    if args.fixture:
        cfg.replay_fixture_path = args.fixture
    if args.device_port:
        cfg.device_port = args.device_port
    if args.enable_haptics:
        cfg.haptics_enabled = True

    print(f"=== Starting SteadyHand Bridge Service on {cfg.host}:{cfg.port} ===")
    print(f"  Mode: {cfg.mode}")
    print(f"  Haptics Enabled: {cfg.haptics_enabled}")
    if cfg.mode == "replay":
        print(f"  Replay Fixture: {cfg.replay_fixture_path}")
    elif cfg.mode == "uno_q":
        print(f"  Hardware Port: {cfg.device_port}")

    app = create_app(cfg)
    uvicorn.run(app, host=cfg.host, port=cfg.port, log_level="info")


if __name__ == "__main__":
    main()
