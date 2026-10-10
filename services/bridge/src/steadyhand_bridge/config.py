"""Bridge configuration management."""

import os
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class BridgeConfig(BaseModel):
    """Runtime configuration for the SteadyHand bridge service."""
    host: str = "127.0.0.1"
    port: int = 8765
    mode: Literal["mock", "replay", "uno_q"] = "mock"
    auth_token: str = "steadyhand-dev-token-secret"
    allowed_origins: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8765",
            "http://127.0.0.1:8765",
        ]
    )
    replay_fixture_path: Optional[str] = None
    device_port: str = "COM3"
    device_baud: int = 115200
    haptics_enabled: bool = False
    window_size_samples: int = 200
    analysis_cadence_ms: int = 250
    stale_timeout_ms: int = 500
    max_frame_bytes: int = 65536  # 64 KiB limit per docs/contracts.md

    @classmethod
    def from_env(cls) -> "BridgeConfig":
        """Load configuration from environment variables with safe defaults."""
        host = os.environ.get("STEADYHAND_HOST", "127.0.0.1")
        port = int(os.environ.get("STEADYHAND_PORT", "8765"))
        mode_val = os.environ.get("STEADYHAND_MODE", "mock").lower()
        if mode_val not in ("mock", "replay", "uno_q"):
            mode_val = "mock"

        token = os.environ.get("STEADYHAND_AUTH_TOKEN", "steadyhand-dev-token-secret")
        origins_str = os.environ.get(
            "STEADYHAND_ALLOWED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8765,http://127.0.0.1:8765",
        )
        origins = [o.strip() for o in origins_str.split(",") if o.strip()]

        replay_path = os.environ.get("STEADYHAND_REPLAY_FIXTURE")
        haptics = os.environ.get("STEADYHAND_HAPTICS_ENABLED", "false").lower() in ("true", "1", "yes")

        return cls(
            host=host,
            port=port,
            mode=mode_val,  # type: ignore[arg-type]
            auth_token=token,
            allowed_origins=origins,
            replay_fixture_path=replay_path,
            device_port=os.environ.get("STEADYHAND_DEVICE_PORT", "COM3"),
            device_baud=int(os.environ.get("STEADYHAND_DEVICE_BAUD", "115200")),
            haptics_enabled=haptics,
        )
