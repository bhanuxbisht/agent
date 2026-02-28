"""API routes for health checks and the bb /create content pipeline."""

import logging
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.schemas.models import CreateRequest, CreateResponse, HealthResponse
from app.services.report_service import (
    CreatorWorkflowService,
    format_sse,
    get_creator_service,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.post("/create", response_model=CreateResponse)
async def create_content(
    request: CreateRequest,
    service: CreatorWorkflowService = Depends(get_creator_service),
) -> CreateResponse:
    state = await service.run_create(
        prompt=request.prompt,
        content_type=request.content_type,
        duration_seconds=request.duration_seconds,
        platform=request.platform,
    )
    return CreateResponse(
        prompt=state["prompt"],
        content_type=state["content_type"],
        platform=state["platform"],
        analysis=state["analysis"],
        script=state["script"],
        timeline=state["timeline"],
        enhancements=state["enhancements"],
        story_structure=state["story_structure"],
        final_blueprint=state["final_blueprint"],
        score=state["score"],
        iteration_count=state["iteration_count"],
    )


@router.get("/create/stream")
async def stream_create(
    prompt: str = Query(..., min_length=3, max_length=2000),
    content_type: str = Query("reel"),
    duration: int = Query(30, ge=5, le=3600),
    platform: str = Query("instagram"),
    service: CreatorWorkflowService = Depends(get_creator_service),
) -> StreamingResponse:
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            async for payload in service.stream_create(
                prompt=prompt,
                content_type=content_type,
                duration_seconds=duration,
                platform=platform,
            ):
                yield format_sse(payload["event"], payload)
        except Exception as exc:  # pragma: no cover
            logger.exception("Streaming failed")
            yield format_sse("error", {"event": "error", "message": str(exc)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
