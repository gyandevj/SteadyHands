"""FastAPI application factory, pipeline lifecycle, and background runner."""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import BridgeConfig
from .adapters.base import BaseDeviceAdapter
from .adapters.mock import MockDeviceAdapter
from .adapters.replay import ReplayDeviceAdapter
from .adapters.uno_q import UnoQDeviceAdapter
from .pipeline.buffers import BoundedSampleBuffer
from .pipeline.acquisition import AcquisitionManager
from .pipeline.analysis_runner import AnalysisRunner
from .pipeline.calibration import CalibrationCoordinator
from .pipeline.haptic_supervisor import HapticSupervisor
from .sessions.store import SessionStore
from .api import health, device, calibration, haptics, sessions, stream
from .api.stream import ws_manager

logger = logging.getLogger("steadyhand_bridge")


async def run_ingestion_loop(app: FastAPI) -> None:
    """Continuously drain batches from adapter into bounded buffer."""
    state = app.state
    adapter: BaseDeviceAdapter = state.adapter
    acq: AcquisitionManager = state.acquisition

    while True:
        try:
            batch = await adapter.drain_batch()
            if batch:
                reboot, has_samples = acq.ingest_batch(batch)
                if reboot:
                    logger.info("MCU Reboot detected. Resetting pipeline state.")
                    state.analysis.set_calibration(None)
                if has_samples and ws_manager.active_connections:
                    await ws_manager.broadcast(batch.model_dump())
            else:
                await asyncio.sleep(0.01)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in ingestion loop: {e}")
            await asyncio.sleep(0.05)


async def run_analysis_loop(app: FastAPI) -> None:
    """Evaluate analysis windows at configured cadence (~250 ms) and broadcast."""
    state = app.state
    acq: AcquisitionManager = state.acquisition
    analysis: AnalysisRunner = state.analysis
    cadence_s = state.config.analysis_cadence_ms / 1000.0

    while True:
        try:
            await asyncio.sleep(cadence_s)
            boot_id = acq.current_boot_id or "unconfigured"
            stream_id = acq.current_stream_id or "unconfigured"
            health_info = acq.get_health(state.adapter.source)

            # Run pure analysis in executor if available
            loop = asyncio.get_running_loop()
            frame = await loop.run_in_executor(
                None,
                analysis.run_window,
                state.adapter.source,
                boot_id,
                stream_id,
                health_info.is_stale,
            )

            state.latest_frame = frame
            # Broadcast frame to active WebSocket subscribers
            await ws_manager.broadcast(frame.model_dump())

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in analysis loop: {e}")


async def run_health_heartbeat_loop(app: FastAPI) -> None:
    """Broadcast health heartbeat every 1.0 second."""
    state = app.state
    acq: AcquisitionManager = state.acquisition

    while True:
        try:
            await asyncio.sleep(1.0)
            health_info = acq.get_health(state.adapter.source)
            await ws_manager.broadcast(health_info.model_dump())
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in health loop: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager starting and stopping adapters and background runners."""
    state = app.state
    await state.adapter.start()

    tasks = [
        asyncio.create_task(run_ingestion_loop(app)),
        asyncio.create_task(run_analysis_loop(app)),
        asyncio.create_task(run_health_heartbeat_loop(app)),
    ]

    yield

    for t in tasks:
        t.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    await state.adapter.stop()


def create_app(config: Optional[BridgeConfig] = None) -> FastAPI:
    """Create and configure FastAPI instance with all routes and pipeline state."""
    cfg = config or BridgeConfig.from_env()

    app = FastAPI(
        title="SteadyHand Bridge",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.allowed_origins,
        allow_origin_regex=r"^chrome-extension://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Instantiate adapter according to configured mode
    if cfg.mode == "mock":
        adapter = MockDeviceAdapter(
            odr_hz=100.0,
            batch_size=10,
            tremor_hz=5.0,
            haptics_enabled=cfg.haptics_enabled,
        )
    elif cfg.mode == "replay":
        fixture_path = cfg.replay_fixture_path or "packages/contracts/examples/sensor-batch.json"
        adapter = ReplayDeviceAdapter(fixture_path=fixture_path, batch_size=10)
    elif cfg.mode == "uno_q":
        adapter = UnoQDeviceAdapter(
            port=cfg.device_port,
            baud=cfg.device_baud,
            haptics_enabled=cfg.haptics_enabled,
        )
    else:
        adapter = MockDeviceAdapter()

    # Core state
    buffer = BoundedSampleBuffer(capacity=1000)
    acquisition = AcquisitionManager(buffer=buffer, stale_timeout_ms=cfg.stale_timeout_ms)
    capability = adapter.get_hello().sensor
    analysis = AnalysisRunner(
        buffer=buffer,
        window_size_samples=cfg.window_size_samples,
        capability=capability,
    )
    calibration_mgr = CalibrationCoordinator(buffer=buffer, capability=capability)
    haptics_mgr = HapticSupervisor(enabled=cfg.haptics_enabled)
    sessions_mgr = SessionStore()

    app.state.config = cfg
    app.state.adapter = adapter
    app.state.buffer = buffer
    app.state.acquisition = acquisition
    app.state.analysis = analysis
    app.state.calibration = calibration_mgr
    app.state.haptics = haptics_mgr
    app.state.sessions = sessions_mgr
    app.state.latest_frame = None

    # Include API routes
    app.include_router(health.router)
    app.include_router(device.router)
    app.include_router(calibration.router)
    app.include_router(haptics.router)
    app.include_router(sessions.router)
    app.include_router(stream.router)

    return app
