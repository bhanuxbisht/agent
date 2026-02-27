"""Service layer that runs the LangGraph workflow and streams progress."""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from typing import Any, AsyncGenerator, Dict

from langchain_groq import ChatGroq
from tavily import TavilyClient

from app.agents.workflow import build_research_graph
from app.core.config import Settings, get_settings
from app.schemas.state import ResearchState

logger = logging.getLogger(__name__)


def create_initial_state(topic: str) -> ResearchState:
    """Construct the initial shared state for each run."""
    return ResearchState(
        topic=topic,
        sub_questions=[],
        research_data=[],
        rag_context="",
        draft_report="",
        critique="",
        score=0,
        iteration_count=0,
        final_report="",
    )


class ReportWorkflowService:
    """Stateless orchestrator wrapper around a compiled LangGraph."""

    def __init__(self, settings: Settings):
        self.settings = settings
        if not settings.groq_api_key:
            raise ValueError("Missing GROQ_API_KEY in environment.")
        if not settings.tavily_api_key:
            raise ValueError("Missing TAVILY_API_KEY in environment.")
        self.llm = ChatGroq(
            model=settings.groq_model,
            api_key=settings.groq_api_key,
            temperature=0.2,
        )
        self.tavily_client = TavilyClient(api_key=settings.tavily_api_key)
        self.graph = build_research_graph(
            llm=self.llm,
            tavily_client=self.tavily_client,
            settings=settings,
        )

    async def run_report(self, topic: str) -> ResearchState:
        """Run graph end-to-end and return final state."""
        initial_state = create_initial_state(topic)
        final_state = await self.graph.ainvoke(initial_state)
        return ResearchState(**final_state)

    async def stream_report(self, topic: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Yield structured events as each graph node updates shared state."""
        initial_state = create_initial_state(topic)
        current_state: Dict[str, Any] = dict(initial_state)

        yield {
            "event": "start",
            "message": "Workflow started",
            "topic": topic,
        }

        async for update in self.graph.astream(initial_state, stream_mode="updates"):
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

        if not current_state.get("final_report"):
            logger.warning("No final_report in stream state; recovering via ainvoke")
            final_state = await self.graph.ainvoke(initial_state)
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
def get_report_service() -> ReportWorkflowService:
    """Singleton-style dependency for FastAPI routes."""
    settings = get_settings()
    return ReportWorkflowService(settings)
