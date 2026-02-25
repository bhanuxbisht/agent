"""Shared LangGraph state definitions."""

from typing import Any, Dict, List, TypedDict


class ResearchState(TypedDict):
    """State object read/written by every agent in the graph."""

    topic: str
    sub_questions: List[str]
    research_data: List[Dict[str, Any]]
    draft_report: str
    critique: str
    score: int
    iteration_count: int
    final_report: str
