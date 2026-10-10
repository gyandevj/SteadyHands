"""Deterministic synthetic 3-axis IMU acceleration signal generator."""

import os
import json
import math
import random
from typing import List, Dict, Any


def generate_quiet_baseline(seed: int = 42, duration_s: float = 3.0, odr_hz: float = 100.0) -> Dict[str, Any]:
    rng = random.Random(seed)
    total_samples = int(duration_s * odr_hz)
    dt_us = int(1_000_000 / odr_hz)
    samples = []

    for i in range(total_samples):
        t_us = i * dt_us
        ax = rng.gauss(0.0, 0.004)
        ay = rng.gauss(0.0, 0.004)
        az = 1.0 + rng.gauss(0.0, 0.004)
        samples.append({
            "seq": i,
            "t_us": t_us,
            "a_g": [round(ax, 5), round(ay, 5), round(az, 5)],
            "valid": True,
            "saturated": False,
            "haptic_active": False,
        })

    return {
        "signal_id": "quiet_baseline_100hz",
        "seed": seed,
        "odr_hz": odr_hz,
        "duration_s": duration_s,
        "components": [
            {"type": "gravity", "vector_g": [0.0, 0.0, 1.0]},
            {"type": "noise", "sigma_g": 0.004},
        ],
        "samples": samples,
    }


def generate_pure_sine(freq_hz: float, amp_g: float, seed: int = 42, duration_s: float = 3.0, odr_hz: float = 100.0) -> Dict[str, Any]:
    rng = random.Random(seed)
    total_samples = int(duration_s * odr_hz)
    dt_us = int(1_000_000 / odr_hz)
    samples = []

    for i in range(total_samples):
        t_us = i * dt_us
        t_sec = t_us / 1_000_000.0
        ax = amp_g * math.sin(2 * math.pi * freq_hz * t_sec) + rng.gauss(0.0, 0.003)
        ay = amp_g * math.cos(2 * math.pi * freq_hz * t_sec) + rng.gauss(0.0, 0.003)
        az = 1.0 + rng.gauss(0.0, 0.003)
        samples.append({
            "seq": i,
            "t_us": t_us,
            "a_g": [round(ax, 5), round(ay, 5), round(az, 5)],
            "valid": True,
            "saturated": False,
            "haptic_active": False,
        })

    name = f"pure_sine_{int(freq_hz)}hz_100hz"
    return {
        "signal_id": name,
        "seed": seed,
        "odr_hz": odr_hz,
        "duration_s": duration_s,
        "components": [
            {"type": "gravity", "vector_g": [0.0, 0.0, 1.0]},
            {"type": "sine", "axis": "x", "freq_hz": freq_hz, "amplitude_g": amp_g},
            {"type": "sine", "axis": "y", "freq_hz": freq_hz, "amplitude_g": amp_g},
            {"type": "noise", "sigma_g": 0.003},
        ],
        "samples": samples,
    }


def generate_multi_tone(seed: int = 42, duration_s: float = 3.0, odr_hz: float = 100.0) -> Dict[str, Any]:
    rng = random.Random(seed)
    total_samples = int(duration_s * odr_hz)
    dt_us = int(1_000_000 / odr_hz)
    samples = []

    for i in range(total_samples):
        t_us = i * dt_us
        t_sec = t_us / 1_000_000.0
        tone1 = 0.035 * math.sin(2 * math.pi * 5.0 * t_sec)
        tone2 = 0.020 * math.sin(2 * math.pi * 8.0 * t_sec)
        ax = tone1 + tone2 + rng.gauss(0.0, 0.003)
        ay = 0.025 * math.cos(2 * math.pi * 5.0 * t_sec) + rng.gauss(0.0, 0.003)
        az = 1.0 + rng.gauss(0.0, 0.003)
        samples.append({
            "seq": i,
            "t_us": t_us,
            "a_g": [round(ax, 5), round(ay, 5), round(az, 5)],
            "valid": True,
            "saturated": False,
            "haptic_active": False,
        })

    return {
        "signal_id": "multi_tone_5hz_8hz_100hz",
        "seed": seed,
        "odr_hz": odr_hz,
        "duration_s": duration_s,
        "components": [
            {"type": "gravity", "vector_g": [0.0, 0.0, 1.0]},
            {"type": "sine", "axis": "x", "freq_hz": 5.0, "amplitude_g": 0.035},
            {"type": "sine", "axis": "x", "freq_hz": 8.0, "amplitude_g": 0.020},
            {"type": "noise", "sigma_g": 0.003},
        ],
        "samples": samples,
    }


def generate_saturation_clipped(seed: int = 42, duration_s: float = 3.0, odr_hz: float = 100.0) -> Dict[str, Any]:
    rng = random.Random(seed)
    total_samples = int(duration_s * odr_hz)
    dt_us = int(1_000_000 / odr_hz)
    samples = []

    for i in range(total_samples):
        t_us = i * dt_us
        t_sec = t_us / 1_000_000.0
        # Transient spike at t = 1.0s exceeding +-2.0g dynamic range
        is_saturated = 1.0 <= t_sec <= 1.08
        if is_saturated:
            ax = 2.0  # clipped
            ay = -2.0  # clipped
            az = 2.0
        else:
            ax = 0.03 * math.sin(2 * math.pi * 5.0 * t_sec) + rng.gauss(0.0, 0.003)
            ay = rng.gauss(0.0, 0.003)
            az = 1.0 + rng.gauss(0.0, 0.003)

        samples.append({
            "seq": i,
            "t_us": t_us,
            "a_g": [round(ax, 5), round(ay, 5), round(az, 5)],
            "valid": True,
            "saturated": is_saturated,
            "haptic_active": False,
        })

    return {
        "signal_id": "saturation_clipped_100hz",
        "seed": seed,
        "odr_hz": odr_hz,
        "duration_s": duration_s,
        "components": [
            {"type": "gravity", "vector_g": [0.0, 0.0, 1.0]},
            {"type": "saturation_transient", "range_g": 2.0},
        ],
        "samples": samples,
    }


def generate_gapped_stream(seed: int = 42, duration_s: float = 3.0, odr_hz: float = 100.0) -> Dict[str, Any]:
    rng = random.Random(seed)
    total_samples = int(duration_s * odr_hz)
    dt_us = int(1_000_000 / odr_hz)
    samples = []
    current_t_us = 0

    for i in range(total_samples):
        # Inject 45ms gap at i = 120
        if i == 120:
            current_t_us += 45000  # 45 ms jump
        else:
            current_t_us += dt_us

        t_sec = current_t_us / 1_000_000.0
        ax = 0.03 * math.sin(2 * math.pi * 5.0 * t_sec) + rng.gauss(0.0, 0.003)
        ay = rng.gauss(0.0, 0.003)
        az = 1.0 + rng.gauss(0.0, 0.003)

        samples.append({
            "seq": i,
            "t_us": current_t_us,
            "a_g": [round(ax, 5), round(ay, 5), round(az, 5)],
            "valid": True,
            "saturated": False,
            "haptic_active": False,
        })

    return {
        "signal_id": "gapped_stream_45ms",
        "seed": seed,
        "odr_hz": odr_hz,
        "duration_s": duration_s,
        "components": [
            {"type": "gap", "max_gap_ms": 45.0},
        ],
        "samples": samples,
    }


def generate_haptic_pulse(seed: int = 42, duration_s: float = 3.0, odr_hz: float = 100.0) -> Dict[str, Any]:
    rng = random.Random(seed)
    total_samples = int(duration_s * odr_hz)
    dt_us = int(1_000_000 / odr_hz)
    samples = []

    for i in range(total_samples):
        t_us = i * dt_us
        t_sec = t_us / 1_000_000.0
        # 40ms pulse active between t = 1.0s and 1.04s
        is_pulse = 1.00 <= t_sec <= 1.04
        is_settling = 1.04 < t_sec <= 1.54  # 500ms post-pulse settling

        if is_pulse:
            ax = 1.2 * math.sin(2 * math.pi * 150.0 * t_sec)
            ay = 0.8 * math.sin(2 * math.pi * 150.0 * t_sec)
            az = 1.0
        elif is_settling:
            dt_decay = t_sec - 1.04
            decay = math.exp(-dt_decay / 0.15)
            ax = 0.3 * decay * math.sin(2 * math.pi * 35.0 * dt_decay) + rng.gauss(0.0, 0.003)
            ay = 0.2 * decay * math.sin(2 * math.pi * 35.0 * dt_decay) + rng.gauss(0.0, 0.003)
            az = 1.0 + rng.gauss(0.0, 0.003)
        else:
            ax = 0.03 * math.sin(2 * math.pi * 5.0 * t_sec) + rng.gauss(0.0, 0.003)
            ay = rng.gauss(0.0, 0.003)
            az = 1.0 + rng.gauss(0.0, 0.003)

        samples.append({
            "seq": i,
            "t_us": t_us,
            "a_g": [round(ax, 5), round(ay, 5), round(az, 5)],
            "valid": True,
            "saturated": False,
            "haptic_active": is_pulse,
        })

    return {
        "signal_id": "haptic_pulse_40ms_cooldown",
        "seed": seed,
        "odr_hz": odr_hz,
        "duration_s": duration_s,
        "components": [
            {"type": "haptic_pulse", "duration_ms": 40, "settling_ms": 500},
        ],
        "samples": samples,
    }


def write_all_signals(target_dir: str):
    os.makedirs(target_dir, exist_ok=True)
    signals = [
        generate_quiet_baseline(),
        generate_pure_sine(5.0, 0.04),
        generate_pure_sine(8.0, 0.035),
        generate_multi_tone(),
        generate_saturation_clipped(),
        generate_gapped_stream(),
        generate_haptic_pulse(),
    ]

    for sig in signals:
        out_path = os.path.join(target_dir, f"{sig['signal_id']}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(sig, f, indent=2)
        print(f"Generated {len(sig['samples'])} samples -> {out_path}")


if __name__ == "__main__":
    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../synthetic/signals"))
    write_all_signals(out_dir)
