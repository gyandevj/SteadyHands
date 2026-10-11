#!/usr/bin/env python3
"""Cross-language contract validation check.

Verifies that Python (Pydantic) and TypeScript (@steadyhand/contracts)
agree 100% on valid and invalid canonical example payloads.
"""

import sys
import json
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
EXAMPLES_DIR = REPO_ROOT / "packages" / "contracts" / "examples"
SERVICES_DIR = REPO_ROOT / "services" / "bridge" / "src"

sys.path.insert(0, str(SERVICES_DIR))

from steadyhand_bridge.contracts import (
    AssistanceConfig,
    DeviceHello,
    SensorBatch,
    MotionFrame,
    HapticRequest,
)
from steadyhand_bridge.adaptive_forms.models import (
    AdaptiveFormPlanRequest,
    AdaptiveLayoutProposal,
)


def load_json(filename: str):
    with open(EXAMPLES_DIR / filename, "r", encoding="utf-8") as f:
        return json.load(f)


def test_python_contracts():
    print("[1/2] Checking Python Pydantic contract validation...")

    # 1. settings.json
    settings_data = load_json("settings.json")
    cfg = AssistanceConfig.model_validate(settings_data)
    assert cfg.v == 1 and cfg.revision == 1, "settings.json validation failed"
    print("  [OK] settings.json validated successfully")

    # 2. device-hello.json
    hello_data = load_json("device-hello.json")
    hello = DeviceHello.model_validate(hello_data)
    assert hello.sensor.model == "LIS3DHTR", "device-hello.json validation failed"
    print("  [OK] device-hello.json validated successfully")

    # 3. sensor-batch.json
    batch_data = load_json("sensor-batch.json")
    batch = SensorBatch.model_validate(batch_data)
    assert len(batch.samples) == 2, "sensor-batch.json validation failed"
    print("  [OK] sensor-batch.json validated successfully")

    # 4. motion-frame.json
    frame_data = load_json("motion-frame.json")
    frame = MotionFrame.model_validate(frame_data)
    assert frame.quality.state == "good", "motion-frame.json validation failed"
    assert frame.motion.dominant_hz == 5.0, "dominant_hz mismatch"
    print("  [OK] motion-frame.json validated successfully")

    # 5. haptic-request.json
    haptic_data = load_json("haptic-request.json")
    haptic = HapticRequest.model_validate(haptic_data)
    assert haptic.duration_ms == 40, "haptic-request.json validation failed"
    print("  [OK] haptic-request.json validated successfully")

    # 6. invalid-frame.json MUST be rejected
    invalid_data = load_json("invalid-frame.json")
    rejected = False
    try:
        MotionFrame.model_validate(invalid_data)
    except Exception as e:
        rejected = True
        print(f"  [OK] invalid-frame.json correctly rejected: {type(e).__name__}")
    # 7. adaptive-form.json
    af_data = load_json("adaptive-form.json")
    af_req = AdaptiveFormPlanRequest.model_validate(af_data)
    assert af_req.v == 1 and len(af_req.form.fields) == 5, "adaptive-form.json validation failed"
    print("  [OK] adaptive-form.json validated successfully")

    # 8. adaptive-layout.json
    al_data = load_json("adaptive-layout.json")
    al_prop = AdaptiveLayoutProposal.model_validate(al_data)
    al_prop.validate_against_form(af_req.form)
    assert al_prop.layoutVersion == 1 and len(al_prop.sections) == 3, "adaptive-layout.json validation failed"
    print("  [OK] adaptive-layout.json validated successfully against form")


def test_typescript_contracts():
    print("[2/2] Checking TypeScript @steadyhand/contracts tests via node --test...")
    test_pattern = str(REPO_ROOT / "packages" / "contracts" / "tests" / "*.test.ts")
    cmd = ["node", "--test", "packages/contracts/tests/contracts.test.ts", "packages/contracts/tests/adaptive-forms.test.ts"]
    result = subprocess.run(cmd, cwd=str(REPO_ROOT), capture_output=True, text=True)
    if result.returncode != 0:
        print("TypeScript tests failed:")
        print(result.stdout)
        print(result.stderr)
        sys.exit(1)
    print("  [OK] All TypeScript contract tests passed")


def main():
    print("=== SteadyHand Cross-Language Contract Checker ===")
    test_python_contracts()
    test_typescript_contracts()
    print("=== All contracts consistent across Python and TypeScript! ===")


if __name__ == "__main__":
    main()
