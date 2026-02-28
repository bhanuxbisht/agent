"""Service layer that runs the LangGraph creator pipeline and streams progress."""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from typing import Any, AsyncGenerator, Dict

from langchain_groq import ChatGroq

from app.agents.workflow import build_creator_graph
from app.core.config import Settings, get_settings
from app.schemas.state import CreatorState

logger = logging.getLogger(__name__)


def create_initial_state(
    prompt: str,
    content_type: str = "reel",
    duration_seconds: int = 30,
    platform: str = "instagram",
) -> CreatorState:
    """Construct the initial shared state for each run."""
    return CreatorState(
        prompt=prompt,
        content_type=content_type,
        duration_seconds=duration_seconds,
        platform=platform,
        analysis={},
        script="",
        timeline=[],
        enhancements={},
        story_structure={},
        critique="",
        score=0,
        iteration_count=0,
        final_blueprint="",
    )


class CreatorWorkflowService:
    """Stateless orchestrator wrapper around the compiled creator LangGraph."""

    def __init__(self, settings: Settings):
        self.settings = settings
        if not settings.groq_api_key:
            raise ValueError("Missing GROQ_API_KEY in environment.")
        self.llm = ChatGroq(
            model=settings.groq_model,
            api_key=settings.groq_api_key,
            temperature=0.4,
        )
        self.graph = build_creator_graph(
            llm=self.llm,
            settings=settings,
        )

    async def run_create(
        self,
        prompt: str,
        content_type: str = "reel",
        duration_seconds: int = 30,
        platform: str = "instagram",
    ) -> CreatorState:
        """Run graph end-to-end and return final state."""
        initial = create_initial_state(prompt, content_type, duration_seconds, platform)
        final_state = await self.graph.ainvoke(initial)
        return CreatorState(**final_state)

    async def stream_create(
        self,
        prompt: str,
        content_type: str = "reel",
        duration_seconds: int = 30,
        platform: str = "instagram",
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Yield structured events as each graph node updates shared state."""
        initial = create_initial_state(prompt, content_type, duration_seconds, platform)
        current_state: Dict[str, Any] = dict(initial)

        yield {
            "event": "start",
            "message": "Creator pipeline started",
            "prompt": prompt,
        }

        async for update in self.graph.astream(initial, stream_mode="updates"):
            if not isinstance(update, dict):
                continue

            for node_name, patch in update.items():
                if isinstance(patch, dict):
                    current_state.update(patch)
                yield {
                    "event": "node",
                    "node": node_name,
                    "patch": patch,
                    "state": current_state,
                }

        if not current_state.get("final_blueprint"):
            logger.warning("No final_blueprint in stream state; recovering via ainvoke")
            final_state = await self.graph.ainvoke(initial)
            current_state.update(final_state)

        yield {
            "event": "done",
            "state": current_state,
        }


def format_sse(event_name: str, payload: Dict[str, Any]) -> str:
    """Format an SSE event packet."""
    data = json.dumps(payload, ensure_ascii=False)
    return f"event: {event_name}\ndata: {data}\n\n"


@lru_cache(maxsize=1)
def get_creator_service() -> CreatorWorkflowService:
    """Singleton-style dependency for FastAPI routes."""
    settings = get_settings()
    return CreatorWorkflowService(settings)
