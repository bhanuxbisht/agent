"""LangGraph workflow for the bb /create content production pipeline.

Pipeline:
  START → Analyzer → Script Writer → Timeline Planner → Enhancement → Story Architect
       → Critic ──[score<7 & loops<max]──→ Refiner → Script Writer (loop)
              └──[score>=7 OR max_loops]──→ Finalizer → END
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Literal

from langchain_core.language_models.chat_models import BaseChatModel
from pydantic import BaseModel, Field

from langgraph.graph import END, START, StateGraph

from app.agents.prompts import (
    ANALYZER_PROMPT,
    CRITIC_PROMPT,
    ENHANCEMENT_PROMPT,
    REFINER_PROMPT,
    SCRIPT_WRITER_PROMPT,
    STORY_ARCHITECT_PROMPT,
    TIMELINE_PLANNER_PROMPT,
)
from app.core.config import Settings
from app.schemas.state import CreatorState

logger = logging.getLogger(__name__)


# ── Structured outputs ──────────────────────────────────────
class AnalyzerOutput(BaseModel):
    language: str = "English"
    region: str = "Global"
    genre: str = "entertainment"
    tone: str = "casual"
    target_audience: str = ""
    visual_style: str = ""
    key_themes: List[str] = Field(default_factory=list)
    platform_optimization: Dict[str, Any] = Field(default_factory=dict)


class CriticOutput(BaseModel):
    score: int = Field(..., ge=1, le=10)
    critique: str = Field(..., min_length=10)


def _safe_json_parse(text: str, fallback: Any = None) -> Any:
    """Try to parse JSON from LLM output, stripping markdown fences."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        # Strip ```json ... ``` wrappers
        lines = cleaned.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("JSON parse failed, using fallback. Raw: %s", cleaned[:200])
        return fallback if fallback is not None else {}


def build_creator_graph(llm: BaseChatModel, settings: Settings):
    """Build and compile the StateGraph for the multi-agent creator pipeline."""

    # ─── Agent 1: Content Analyzer ──────────────────────────
    async def analyzer_node(state: CreatorState) -> Dict[str, Any]:
        prompt = ANALYZER_PROMPT.format(
            prompt=state["prompt"],
            content_type=state["content_type"],
            duration_seconds=state["duration_seconds"],
            platform=state["platform"],
        )
        response = await llm.ainvoke(prompt)
        data = _safe_json_parse(response.content, fallback={})
        # Build with defaults for any missing fields
        valid_fields = AnalyzerOutput.model_fields.keys()
        filtered = {k: v for k, v in data.items() if k in valid_fields}
        result = AnalyzerOutput(**filtered)
        analysis = result.model_dump()
        logger.info("Analyzer: language=%s genre=%s tone=%s", analysis.get("language"), analysis.get("genre"), analysis.get("tone"))
        return {"analysis": analysis}

    # ─── Agent 2: Script Writer ─────────────────────────────
    async def script_writer_node(state: CreatorState) -> Dict[str, Any]:
        analysis = state.get("analysis", {})
        prompt = SCRIPT_WRITER_PROMPT.format(
            prompt=state["prompt"],
            content_type=state["content_type"],
            duration_seconds=state["duration_seconds"],
            platform=state["platform"],
            analysis=json.dumps(analysis, indent=2, ensure_ascii=False),
            language=analysis.get("language", "English"),
        )
        response = await llm.ainvoke(prompt)
        logger.info("Script Writer: generated %d chars", len(response.content))
        return {"script": response.content}

    # ─── Agent 3: Timeline Planner ──────────────────────────
    async def timeline_planner_node(state: CreatorState) -> Dict[str, Any]:
        prompt = TIMELINE_PLANNER_PROMPT.format(
            prompt=state["prompt"],
            duration_seconds=state["duration_seconds"],
            platform=state["platform"],
            script=state.get("script", ""),
            analysis=json.dumps(state.get("analysis", {}), indent=2, ensure_ascii=False),
        )
        response = await llm.ainvoke(prompt)
        timeline = _safe_json_parse(response.content, fallback=[])
        if not isinstance(timeline, list):
            timeline = []
        logger.info("Timeline Planner: %d shots", len(timeline))
        return {"timeline": timeline}

    # ─── Agent 4: Enhancement Agent ─────────────────────────
    async def enhancement_node(state: CreatorState) -> Dict[str, Any]:
        prompt = ENHANCEMENT_PROMPT.format(
            prompt=state["prompt"],
            content_type=state["content_type"],
            platform=state["platform"],
            duration_seconds=state["duration_seconds"],
            script=state.get("script", ""),
            timeline=json.dumps(state.get("timeline", []), indent=2, ensure_ascii=False),
            analysis=json.dumps(state.get("analysis", {}), indent=2, ensure_ascii=False),
        )
        response = await llm.ainvoke(prompt)
        enhancements = _safe_json_parse(response.content, fallback={})
        logger.info("Enhancement Agent: %d keys", len(enhancements))
        return {"enhancements": enhancements}

    # ─── Agent 5: Story Architect ───────────────────────────
    async def story_architect_node(state: CreatorState) -> Dict[str, Any]:
        prompt = STORY_ARCHITECT_PROMPT.format(
            prompt=state["prompt"],
            content_type=state["content_type"],
            duration_seconds=state["duration_seconds"],
            script=state.get("script", ""),
            analysis=json.dumps(state.get("analysis", {}), indent=2, ensure_ascii=False),
        )
        response = await llm.ainvoke(prompt)
        story = _safe_json_parse(response.content, fallback={})
        logger.info("Story Architect: arc=%s", story.get("narrative_arc", "?")[:50])
        return {"story_structure": story}

    # ─── Critic ─────────────────────────────────────────────
    async def critic_node(state: CreatorState) -> Dict[str, Any]:
        prompt = CRITIC_PROMPT.format(
            prompt=state["prompt"],
            content_type=state["content_type"],
            platform=state["platform"],
            script=state.get("script", ""),
            timeline=json.dumps(state.get("timeline", []), indent=2, ensure_ascii=False),
            enhancements=json.dumps(state.get("enhancements", {}), indent=2, ensure_ascii=False),
        )
        response = await llm.ainvoke(prompt)
        data = _safe_json_parse(response.content, fallback={"score": 7, "critique": "Good quality content."})
        score = max(1, min(10, int(data.get("score", 7))))
        critique_text = str(data.get("critique", "Good quality content.")).strip()
        new_iter = state.get("iteration_count", 0) + 1
        logger.info("Critic: score=%d iteration=%d", score, new_iter)
        return {
            "score": score,
            "critique": critique_text,
            "iteration_count": new_iter,
        }

    # ─── Refiner ────────────────────────────────────────────
    async def refiner_node(state: CreatorState) -> Dict[str, Any]:
        prompt = REFINER_PROMPT.format(
            prompt=state["prompt"],
            platform=state["platform"],
            script=state.get("script", ""),
            critique=state.get("critique", ""),
            analysis=json.dumps(state.get("analysis", {}), indent=2, ensure_ascii=False),
        )
        response = await llm.ainvoke(prompt)
        return {"script": response.content}

    # ─── Finalizer ──────────────────────────────────────────
    async def finalizer_node(state: CreatorState) -> Dict[str, Any]:
        """Assemble the final production blueprint in markdown."""
        analysis = state.get("analysis", {})
        enhancements = state.get("enhancements", {})
        story = state.get("story_structure", {})
        timeline = state.get("timeline", [])

        blueprint_lines = [
            f"# 🎬 Production Blueprint",
            f"",
            f"**Prompt:** {state['prompt']}",
            f"**Type:** {state['content_type']} | **Platform:** {state['platform']} | **Duration:** {state['duration_seconds']}s",
            f"**Language:** {analysis.get('language', 'English')} | **Region:** {analysis.get('region', 'Global')} | **Genre:** {analysis.get('genre', 'general')}",
            f"**Quality Score:** {state.get('score', 0)}/10 | **Iterations:** {state.get('iteration_count', 0)}",
            f"",
            f"---",
            f"",
            f"## 📊 Content Analysis",
            f"- **Tone:** {analysis.get('tone', 'N/A')}",
            f"- **Visual Style:** {analysis.get('visual_style', 'N/A')}",
            f"- **Target Audience:** {analysis.get('target_audience', 'N/A')}",
            f"- **Key Themes:** {', '.join(analysis.get('key_themes', []))}",
            f"",
            f"## 📝 Script",
            f"",
            state.get("script", "_No script generated._"),
            f"",
            f"## 🎯 Shot-by-Shot Timeline",
            f"",
        ]

        for i, shot in enumerate(timeline, 1):
            blueprint_lines.append(f"### Shot {i}: {shot.get('timestamp', '??:??')}")
            blueprint_lines.append(f"- **Type:** {shot.get('shot_type', 'N/A')}")
            blueprint_lines.append(f"- **Visual:** {shot.get('visual', 'N/A')}")
            blueprint_lines.append(f"- **Audio:** {shot.get('audio', 'N/A')}")
            if shot.get("text_overlay"):
                blueprint_lines.append(f"- **Text Overlay:** {shot['text_overlay']}")
            blueprint_lines.append(f"- **Transition:** {shot.get('transition', 'cut')}")
            if shot.get("notes"):
                blueprint_lines.append(f"- **Notes:** {shot['notes']}")
            blueprint_lines.append("")

        blueprint_lines.extend([
            f"## 🚀 Enhancements",
            f"",
            f"### Opening Hooks",
        ])
        for i, hook in enumerate(enhancements.get("hooks", []), 1):
            blueprint_lines.append(f"{i}. {hook}")

        blueprint_lines.extend(["", "### Music Suggestions"])
        for m in enhancements.get("music_suggestions", []):
            if isinstance(m, dict):
                blueprint_lines.append(f"- **{m.get('name', 'Track')}** — {m.get('mood', '')} ({m.get('source', '')})")
            else:
                blueprint_lines.append(f"- {m}")

        blueprint_lines.extend([
            f"",
            f"### Color Grading",
            f"{enhancements.get('color_grading', 'N/A')}",
            f"",
            f"### Hashtags",
            f"{' '.join(enhancements.get('hashtags', []))}",
            f"",
            f"### Captions",
        ])
        for c in enhancements.get("captions", []):
            if isinstance(c, dict):
                blueprint_lines.append(f"- **{c.get('style', 'caption')}:** {c.get('text', '')}")
            else:
                blueprint_lines.append(f"- {c}")

        blueprint_lines.extend([
            f"",
            f"## 📖 Story Architecture",
            f"- **Narrative Arc:** {story.get('narrative_arc', 'N/A')}",
            f"- **Payoff:** {story.get('payoff', 'N/A')}",
            f"- **Series Potential:** {story.get('series_potential', 'N/A')}",
        ])

        if story.get("emotion_map"):
            blueprint_lines.append(f"")
            blueprint_lines.append(f"### Emotion Map")
            for em in story["emotion_map"]:
                if isinstance(em, dict):
                    blueprint_lines.append(f"- **{em.get('timestamp', '?')}:** {em.get('emotion', '?')}")
                else:
                    blueprint_lines.append(f"- {em}")

        blueprint_lines.extend([
            f"",
            f"---",
            f"*Generated by bb /create — Multi-Agent Content Production Engine*",
        ])

        return {"final_blueprint": "\n".join(blueprint_lines)}

    # ─── Routing ────────────────────────────────────────────
    def route_after_critic(state: CreatorState) -> Literal["refine", "finalize"]:
        score = state.get("score", 0)
        loops = state.get("iteration_count", 0)
        if score >= settings.min_quality_score:
            return "finalize"
        if loops >= settings.max_iterations:
            return "finalize"
        return "refine"

    # ─── Build graph ────────────────────────────────────────
    graph_builder = StateGraph(CreatorState)
    graph_builder.add_node("analyzer", analyzer_node)
    graph_builder.add_node("script_writer", script_writer_node)
    graph_builder.add_node("timeline_planner", timeline_planner_node)
    graph_builder.add_node("enhancer", enhancement_node)
    graph_builder.add_node("story_architect", story_architect_node)
    graph_builder.add_node("critic", critic_node)
    graph_builder.add_node("refiner", refiner_node)
    graph_builder.add_node("finalizer", finalizer_node)

    graph_builder.add_edge(START, "analyzer")
    graph_builder.add_edge("analyzer", "script_writer")
    graph_builder.add_edge("script_writer", "timeline_planner")
    graph_builder.add_edge("timeline_planner", "enhancer")
    graph_builder.add_edge("enhancer", "story_architect")
    graph_builder.add_edge("story_architect", "critic")
    graph_builder.add_conditional_edges(
        "critic",
        route_after_critic,
        {"refine": "refiner", "finalize": "finalizer"},
    )
    graph_builder.add_edge("refiner", "script_writer")
    graph_builder.add_edge("finalizer", END)

    return graph_builder.compile()

