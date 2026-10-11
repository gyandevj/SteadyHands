"""Strict Pydantic models and validators for Adaptive Forms with Gemini.

Conforms to docs/contracts.md (Section 12) and packages/contracts/src/adaptiveForms.ts.
Zero tolerance for sensitive fields, extra keys, or altered DOM order.
"""

import re
from typing import List, Literal, Optional, Set
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


MAX_FIELDS = 40
MAX_TOTAL_OPTIONS = 200
MAX_SECTIONS = 6
MAX_TITLE_LEN = 80
MAX_LABEL_LEN = 80

SENSITIVE_KEYWORDS = [
    "password",
    "passwd",
    "creditcard",
    "credit-card",
    "cvv",
    "cvc",
    "ssn",
    "socialsecurity",
    "token",
    "secret",
    "private_key",
    "cardnumber",
]


def check_no_sensitive_tokens(text: str, context: str) -> None:
    norm = re.sub(r"[\s_-]+", "", text.lower())
    for kw in SENSITIVE_KEYWORDS:
        clean_kw = re.sub(r"[\s_-]+", "", kw)
        if clean_kw in norm:
            raise ValueError(f"Prohibited sensitive keyword detected ('{kw}') in {context}")


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AdaptiveFieldOption(StrictModel):
    id: str = Field(min_length=1, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    label: str = Field(min_length=1, max_length=MAX_LABEL_LEN)

    @field_validator("label")
    @classmethod
    def validate_label(cls, v: str) -> str:
        check_no_sensitive_tokens(v, "option label")
        return v


AdaptiveFieldType = Literal["text", "textarea", "checkbox", "radio", "select"]


class AdaptiveField(StrictModel):
    id: str = Field(min_length=1, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    type: AdaptiveFieldType
    label: str = Field(min_length=1, max_length=MAX_LABEL_LEN)
    required: bool
    options: Optional[List[AdaptiveFieldOption]] = None

    @field_validator("label")
    @classmethod
    def validate_label(cls, v: str) -> str:
        check_no_sensitive_tokens(v, "field label")
        return v

    @field_validator("options")
    @classmethod
    def validate_option_uniqueness(cls, v: Optional[List[AdaptiveFieldOption]]) -> Optional[List[AdaptiveFieldOption]]:
        if v is not None:
            seen: Set[str] = set()
            for opt in v:
                if opt.id in seen:
                    raise ValueError(f"Duplicate option ID '{opt.id}' in field")
                seen.add(opt.id)
        return v


class AdaptiveBlock(StrictModel):
    id: str = Field(min_length=1, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    fieldIds: List[str] = Field(min_length=1)


class AdaptiveFormData(StrictModel):
    formId: str = Field(min_length=1, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    fields: List[AdaptiveField] = Field(min_length=1, max_length=MAX_FIELDS)
    blocks: List[AdaptiveBlock] = Field(min_length=1)

    @field_validator("formId")
    @classmethod
    def validate_form_id(cls, v: str) -> str:
        check_no_sensitive_tokens(v, "formId")
        return v

    @model_validator(mode="after")
    def validate_graph_integrity(self) -> "AdaptiveFormData":
        # 1. Field IDs must be unique
        field_ids = [f.id for f in self.fields]
        if len(field_ids) != len(set(field_ids)):
            raise ValueError("Duplicate field ID found in form.fields")
        field_set = set(field_ids)

        # 2. Total options limit
        total_opts = sum(len(f.options) for f in self.fields if f.options)
        if total_opts > MAX_TOTAL_OPTIONS:
            raise ValueError(f"Total options count {total_opts} exceeds maximum {MAX_TOTAL_OPTIONS}")

        # 3. Block validation: every field in block must exist and fields cannot overlap
        covered_fields: Set[str] = set()
        block_ids: Set[str] = set()

        for block in self.blocks:
            if block.id in block_ids:
                raise ValueError(f"Duplicate block ID '{block.id}'")
            block_ids.add(block.id)

            for fid in block.fieldIds:
                if fid not in field_set:
                    raise ValueError(f"Block '{block.id}' references unknown field '{fid}'")
                if fid in covered_fields:
                    raise ValueError(f"Field '{fid}' is assigned to multiple blocks")
                covered_fields.add(fid)

        for fid in field_set:
            if fid not in covered_fields:
                raise ValueError(f"Field '{fid}' is not assigned to any block")

        return self


class AdaptiveFormPlanRequest(StrictModel):
    v: Literal[1] = 1
    requestId: str = Field(min_length=1, max_length=64)
    form: AdaptiveFormData


class AdaptiveSection(StrictModel):
    title: str = Field(min_length=1, max_length=MAX_TITLE_LEN)
    fieldIds: List[str] = Field(min_length=1)

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        check_no_sensitive_tokens(v, "section title")
        return v


class AdaptivePresentation(StrictModel):
    layout: Literal["single-column"] = "single-column"
    spacing: Literal["large", "normal", "compact"] = "large"
    controls: Literal["large", "normal"] = "large"


class AdaptiveLayoutProposal(StrictModel):
    layoutVersion: Literal[1] = 1
    sections: List[AdaptiveSection] = Field(min_length=1, max_length=MAX_SECTIONS)
    presentation: AdaptivePresentation = Field(default_factory=AdaptivePresentation)

    @model_validator(mode="after")
    def validate_section_field_uniqueness(self) -> "AdaptiveLayoutProposal":
        seen: Set[str] = set()
        for sec in self.sections:
            for fid in sec.fieldIds:
                if fid in seen:
                    raise ValueError(f"Field '{fid}' appears multiple times across sections")
                seen.add(fid)
        return self

    def validate_against_form(self, form: AdaptiveFormData) -> None:
        """Validates semantic integrity against the original request form."""
        expected_fids = [f.id for f in form.fields]
        flattened = [fid for sec in self.sections for fid in sec.fieldIds]

        # 1. Total count and all field IDs matched
        if len(flattened) != len(expected_fids):
            raise ValueError(
                f"Section field count ({len(flattened)}) does not match form field count ({len(expected_fids)})"
            )

        # 2. Strict preservation of original DOM order
        for idx, (actual, expected) in enumerate(zip(flattened, expected_fids)):
            if actual != expected:
                raise ValueError(
                    f"Field order altered at index {idx}: expected '{expected}', got '{actual}'"
                )

        # 3. Block atomicity
        for block in form.blocks:
            if len(block.fieldIds) > 1:
                block_set = set(block.fieldIds)
                # Find which section has the first field
                containing_sections = [
                    sec_idx
                    for sec_idx, sec in enumerate(self.sections)
                    if any(fid in block_set for fid in sec.fieldIds)
                ]
                if len(containing_sections) > 1:
                    raise ValueError(f"Atomic block '{block.id}' split across multiple sections")
                if containing_sections:
                    sec = self.sections[containing_sections[0]]
                    if not block_set.issubset(set(sec.fieldIds)):
                        raise ValueError(f"Atomic block '{block.id}' not fully contained in section")
