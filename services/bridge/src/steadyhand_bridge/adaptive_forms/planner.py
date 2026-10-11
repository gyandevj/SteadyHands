"""Gemini-powered Adaptive Form Planner.

Interfaces with the Google Gemini API using structured outputs,
enforcing exact DOM field order, block atomicity, and strict accessibility styling.
"""

import asyncio
import json
import logging
from typing import Optional

from .models import (
    AdaptiveFormPlanRequest,
    AdaptiveLayoutProposal,
    AdaptiveSection,
    AdaptivePresentation,
)

logger = logging.getLogger("steadyhand_bridge.adaptive_forms.planner")

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


SYSTEM_PROMPT = """You are an assistive technology engine for SteadyHand, optimizing web forms for individuals with hand tremors.
Analyze the input form structure and group its fields into logical, accessible sections with clear, concise titles.

MANDATORY RULES:
1. Every input field ID from form.fields MUST appear in sections exactly once.
2. The sequence of field IDs across all sections MUST strictly preserve the exact initial DOM order in form.fields. Do NOT reorder fields.
3. Fields belonging to the same block in form.blocks MUST be grouped together in the same section. Do NOT split atomic blocks.
4. Keep section count between 1 and 6.
5. Section titles must be brief, friendly, and under 80 characters.
6. Presentation must use layout: "single-column", spacing: "large", controls: "large".
7. Return ONLY valid JSON matching the schema.
"""


class AdaptiveFormPlanner:
    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: str = "gemini-3.8-flash",
        mock_mode: bool = False,
        timeout_seconds: float = 12.0,
    ):
        self.api_key = api_key
        self.model_name = model_name
        self.mock_mode = mock_mode
        self.timeout_seconds = timeout_seconds
        self._client = None

        if GENAI_AVAILABLE and api_key and not mock_mode:
            try:
                self._client = genai.Client(api_key=api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize google-genai client: {e}")

    async def plan(self, request: AdaptiveFormPlanRequest) -> AdaptiveLayoutProposal:
        """Generates a structured layout proposal for the requested form."""
        if self._client is not None and not self.mock_mode:
            return await self._plan_with_gemini(request)
        else:
            return self._plan_heuristic_fallback(request)

    async def _plan_with_gemini(self, request: AdaptiveFormPlanRequest) -> AdaptiveLayoutProposal:
        """Calls official Gemini API with structured outputs."""
        form_payload = request.form.model_dump_json(indent=2)
        prompt = f"Please structure the following form into accessible sections:\n\n{form_payload}"

        try:
            async with asyncio.timeout(self.timeout_seconds):
                # Call async Gemini client
                response = await self._client.aio.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        response_mime_type="application/json",
                        response_schema=AdaptiveLayoutProposal,
                        temperature=0.2,
                    ),
                )

                if not response.text:
                    raise RuntimeError("Gemini returned empty response")

                proposal = AdaptiveLayoutProposal.model_validate_json(response.text)
                proposal.validate_against_form(request.form)
                return proposal

        except asyncio.TimeoutError:
            logger.error("Gemini request timed out after %s seconds", self.timeout_seconds)
            raise RuntimeError(f"Gemini planner timed out after {self.timeout_seconds}s")
        except Exception as e:
            logger.error("Gemini planning failed: %s", e)
            raise RuntimeError(f"Gemini planning failed: {e}")

    def _plan_heuristic_fallback(self, request: AdaptiveFormPlanRequest) -> AdaptiveLayoutProposal:
        """Deterministic heuristic fallback preserving exact DOM order and block atomicity."""
        form = request.form
        blocks = form.blocks
        num_blocks = len(blocks)

        sections: list[AdaptiveSection] = []

        if num_blocks <= 2:
            all_fids = [fid for b in blocks for fid in b.fieldIds]
            sections.append(AdaptiveSection(title="Main Section", fieldIds=all_fids))
        elif num_blocks <= 4:
            mid = (num_blocks + 1) // 2
            sec1_fids = [fid for b in blocks[:mid] for fid in b.fieldIds]
            sec2_fids = [fid for b in blocks[mid:] for fid in b.fieldIds]
            sections.append(AdaptiveSection(title="Initial Information", fieldIds=sec1_fids))
            sections.append(AdaptiveSection(title="Additional Details", fieldIds=sec2_fids))
        else:
            # Group into 3 sections
            s1_count = num_blocks // 3
            s2_count = (num_blocks - s1_count) // 2
            b1 = blocks[:s1_count]
            b2 = blocks[s1_count : s1_count + s2_count]
            b3 = blocks[s1_count + s2_count :]

            sections.append(AdaptiveSection(title="Primary Details", fieldIds=[fid for b in b1 for fid in b.fieldIds]))
            sections.append(AdaptiveSection(title="Preferences & Choices", fieldIds=[fid for b in b2 for fid in b.fieldIds]))
            sections.append(AdaptiveSection(title="Confirmation & Options", fieldIds=[fid for b in b3 for fid in b.fieldIds]))

        proposal = AdaptiveLayoutProposal(
            layoutVersion=1,
            sections=sections,
            presentation=AdaptivePresentation(
                layout="single-column",
                spacing="large",
                controls="large",
            ),
        )
        proposal.validate_against_form(form)
        return proposal
