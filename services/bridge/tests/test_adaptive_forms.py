"""Tests for Adaptive Forms with Gemini endpoint, models, and security."""

import json
from pathlib import Path
import pytest
from starlette.testclient import TestClient

from steadyhand_bridge.config import BridgeConfig
from steadyhand_bridge.main import create_app
from steadyhand_bridge.adaptive_forms.models import (
    AdaptiveFormPlanRequest,
    AdaptiveLayoutProposal,
    AdaptiveSection,
    AdaptivePresentation,
)

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
EXAMPLES_DIR = REPO_ROOT / "packages" / "contracts" / "examples"


def load_example(name: str) -> dict:
    with open(EXAMPLES_DIR / name, "r", encoding="utf-8") as f:
        return json.load(f)


def test_models_valid_canonical_request():
    data = load_example("adaptive-form.json")
    req = AdaptiveFormPlanRequest.model_validate(data)
    assert req.v == 1
    assert req.form.formId == "form-workshop-preferences"
    assert len(req.form.fields) == 5
    assert len(req.form.blocks) == 5


def test_models_valid_canonical_proposal():
    req_data = load_example("adaptive-form.json")
    req = AdaptiveFormPlanRequest.model_validate(req_data)

    prop_data = load_example("adaptive-layout.json")
    prop = AdaptiveLayoutProposal.model_validate(prop_data)
    prop.validate_against_form(req.form)
    assert prop.layoutVersion == 1
    assert len(prop.sections) == 3


def test_models_reject_sensitive_token():
    req_data = load_example("adaptive-form.json")
    req_data["form"]["fields"][0]["label"] = "Your Secret Password"
    with pytest.raises(ValueError, match="Prohibited sensitive keyword"):
        AdaptiveFormPlanRequest.model_validate(req_data)


def test_models_reject_order_reversal():
    req_data = load_example("adaptive-form.json")
    req = AdaptiveFormPlanRequest.model_validate(req_data)

    prop_data = load_example("adaptive-layout.json")
    # Swap fields in section 0
    prop_data["sections"][0]["fieldIds"] = ["field-2", "field-1"]
    prop = AdaptiveLayoutProposal.model_validate(prop_data)
    with pytest.raises(ValueError, match="Field order altered"):
        prop.validate_against_form(req.form)


def test_models_reject_split_block():
    req_data = load_example("adaptive-form.json")
    req_data["form"]["blocks"] = [
        {"id": "block-1", "fieldIds": ["field-1", "field-3"]},
        {"id": "block-2", "fieldIds": ["field-2"]},
        {"id": "block-4", "fieldIds": ["field-4"]},
        {"id": "block-5", "fieldIds": ["field-5"]},
    ]
    req = AdaptiveFormPlanRequest.model_validate(req_data)

    prop_data = load_example("adaptive-layout.json")
    prop = AdaptiveLayoutProposal.model_validate(prop_data)
    with pytest.raises(ValueError, match="Atomic block .* split across"):
        prop.validate_against_form(req.form)


def test_api_plan_endpoint_success():
    cfg = BridgeConfig(mode="mock", gemini_api_key=None)
    app = create_app(cfg)

    with TestClient(app) as client:
        req_data = load_example("adaptive-form.json")
        resp = client.post("/v1/adaptive-forms/plan", json=req_data)
        assert resp.status_code == 200
        data = resp.json()
        assert data["layoutVersion"] == 1
        assert "sections" in data
        assert data["presentation"]["layout"] == "single-column"
        assert data["presentation"]["spacing"] == "large"

        # Validate response complies with canonical request form
        prop = AdaptiveLayoutProposal.model_validate(data)
        req = AdaptiveFormPlanRequest.model_validate(req_data)
        prop.validate_against_form(req.form)


def test_api_pairing_token_auth():
    cfg = BridgeConfig(
        mode="mock",
        adaptive_forms_pairing_token="secret-ai-token-123",
    )
    app = create_app(cfg)

    with TestClient(app) as client:
        req_data = load_example("adaptive-form.json")

        # Without token -> 401
        resp = client.post("/v1/adaptive-forms/plan", json=req_data)
        assert resp.status_code == 401

        # With incorrect token -> 401
        resp = client.post(
            "/v1/adaptive-forms/plan",
            json=req_data,
            headers={"Authorization": "Bearer wrong-token"},
        )
        assert resp.status_code == 401

        # With correct token -> 200
        resp = client.post(
            "/v1/adaptive-forms/plan",
            json=req_data,
            headers={"Authorization": "Bearer secret-ai-token-123"},
        )
        assert resp.status_code == 200


def test_api_rate_limiting():
    cfg = BridgeConfig(mode="mock")
    app = create_app(cfg)
    app.state.adaptive_forms_security.rate_limit_per_minute = 2

    with TestClient(app) as client:
        req_data = load_example("adaptive-form.json")

        # Request 1 -> 200
        resp1 = client.post("/v1/adaptive-forms/plan", json=req_data)
        assert resp1.status_code == 200

        # Request 2 -> 200
        resp2 = client.post("/v1/adaptive-forms/plan", json=req_data)
        assert resp2.status_code == 200

        # Request 3 -> 429
        resp3 = client.post("/v1/adaptive-forms/plan", json=req_data)
        assert resp3.status_code == 429
