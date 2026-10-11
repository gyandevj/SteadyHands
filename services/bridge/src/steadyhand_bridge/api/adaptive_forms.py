"""Adaptive Forms with Gemini endpoint."""

from fastapi import APIRouter, HTTPException, Request, status
from ..adaptive_forms.models import AdaptiveFormPlanRequest, AdaptiveLayoutProposal
from ..adaptive_forms.planner import AdaptiveFormPlanner
from ..adaptive_forms.security import SecurityManager

router = APIRouter(prefix="/v1/adaptive-forms", tags=["adaptive-forms"])


@router.post("/plan", response_model=AdaptiveLayoutProposal)
async def plan_adaptive_form(
    plan_request: AdaptiveFormPlanRequest,
    request: Request,
) -> AdaptiveLayoutProposal:
    """Generate a structured, accessible layout proposal for a sanitized form."""
    state = request.app.state
    config = state.config

    if not getattr(config, "adaptive_forms_enabled", True):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Adaptive Forms feature is disabled on this bridge",
        )

    sec: SecurityManager = state.adaptive_forms_security
    sec.verify_request(request)
    sec.check_rate_limit(client_key=plan_request.requestId)

    planner: AdaptiveFormPlanner = state.adaptive_forms_planner

    async with sec.semaphore:
        try:
            proposal = await planner.plan(plan_request)
            return proposal
        except RuntimeError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(e),
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Semantic layout validation failed: {e}",
            )
