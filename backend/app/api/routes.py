"""API routes for health checks and report generation."""

import logging
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.schemas.models import HealthResponse, ReportRequest, ReportResponse
from app.services.report_service import (
    ReportWorkflowService,
    format_sse,
    get_report_service,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.post("/report", response_model=ReportResponse)
async def generate_report(
    request: ReportRequest,
    service: ReportWorkflowService = Depends(get_report_service),
) -> ReportResponse:
    state = await service.run_report(request.topic)
    return ReportResponse(
        topic=state["topic"],
        final_report=state["final_report"],
        score=state["score"],
        critique=state["critique"],
        iteration_count=state["iteration_count"],
        sub_questions=state["sub_questions"],
        research_data=state["research_data"],
    )


@router.get("/report/stream")
async def stream_report(
    topic: str = Query(..., min_length=3, max_length=300),
    service: ReportWorkflowService = Depends(get_report_service),
) -> StreamingResponse:
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            async for payload in service.stream_report(topic):
                yield format_sse(payload["event"], payload)
        except Exception as exc:  # pragma: no cover - defensive streaming fallback
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
