"""Shared LangGraph state definitions for the Creator Pipeline."""

from typing import Any, Dict, List, TypedDict


class CreatorState(TypedDict):
    """State object read/written by every agent in the creator graph."""

    # ── User input ──
    prompt: str                        # Raw user prompt
    content_type: str                  # reel, short, youtube, film, podcast, etc.
    duration_seconds: int              # Target duration in seconds
    platform: str                      # instagram, youtube, tiktok, etc.

    # ── Analyzer output ──
    analysis: Dict[str, Any]           # genre, language, region, tone, audience, etc.

    # ── Script Writer output ──
    script: str                        # Full script with dialogue + visual cues

    # ── Timeline Planner output ──
    timeline: List[Dict[str, Any]]     # Shot-by-shot breakdown

    # ── Enhancement Agent output ──
    enhancements: Dict[str, Any]       # hooks, transitions, music, hashtags, color

    # ── Story Architect output ──
    story_structure: Dict[str, Any]    # narrative arc, pacing, emotion beats

    # ── Quality loop ──
    critique: str
    score: int
    iteration_count: int

    # ── Final output ──
    final_blueprint: str               # Complete production blueprint (markdown)

