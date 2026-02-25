"""Request/response models for the API layer."""

from typing import Any, Dict, List

from pydantic import BaseModel, Field


class ReportRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=300)


class ReportResponse(BaseModel):
    topic: str
    final_report: str
    score: int
    critique: str
    iteration_count: int
    sub_questions: List[str]
    research_data: List[Dict[str, Any]]


class HealthResponse(BaseModel):
    status: str
