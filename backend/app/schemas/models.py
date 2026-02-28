"""Request/response models for the API layer."""

from typing import Any, Dict, List

from pydantic import BaseModel, Field


class CreateRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=2000)
    content_type: str = Field("reel", description="reel, short, youtube, film, podcast")
    duration_seconds: int = Field(30, ge=5, le=3600)
    platform: str = Field("instagram", description="instagram, youtube, tiktok, general")


class CreateResponse(BaseModel):
    prompt: str
    content_type: str
    platform: str
    analysis: Dict[str, Any]
    script: str
    timeline: List[Dict[str, Any]]
    enhancements: Dict[str, Any]
    story_structure: Dict[str, Any]
    final_blueprint: str
    score: int
    iteration_count: int


class HealthResponse(BaseModel):
    status: str

