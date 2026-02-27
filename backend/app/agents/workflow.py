"""LangGraph workflow containing planner, researcher, writer, critic, and refiner agents."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Literal

from langchain_core.language_models.chat_models import BaseChatModel
from pydantic import BaseModel, Field
from tavily import TavilyClient

from langgraph.graph import END, START, StateGraph

from app.agents.prompts import (
    CRITIC_PROMPT,
    PLANNER_PROMPT,
    REFINER_PROMPT,
    WRITER_PROMPT,
)
from app.core.config import Settings
from app.schemas.state import ResearchState
from app.services.rag_service import RAGService

logger = logging.getLogger(__name__)


class PlannerOutput(BaseModel):
    """Structured output for Planner Agent."""

    sub_questions: List[str] = Field(..., min_length=4, max_length=5)


class CriticOutput(BaseModel):
    """Structured output for Critic Agent."""

    score: int = Field(..., ge=1, le=10)
    critique: str = Field(..., min_length=15)


def _clean_questions(questions: List[str]) -> List[str]:
    cleaned = []
    seen = set()
    for q in questions:
        candidate = q.strip()
        if not candidate:
            continue
        lowered = candidate.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        cleaned.append(candidate)
    return cleaned[:5]


def _render_sources(research_data: List[Dict[str, Any]]) -> str:
    lines: List[str] = []
    for block in research_data:
        question = block.get("sub_question", "Unknown question")
        lines.append(f"Sub-question: {question}")
        for item in block.get("sources", []):
            title = item.get("title", "Untitled")
            url = item.get("url", "")
            snippet = item.get("snippet", "")
            lines.append(f"- {title} | {url} | {snippet}")
        lines.append("")
    return "\n".join(lines).strip()


def build_research_graph(
    llm: BaseChatModel,
    tavily_client: TavilyClient,
    settings: Settings,
):
    """Build and compile the StateGraph for the multi-agent workflow.

    ASCII diagram of the graph:

    # START
    #   |
    # [Planner] -> [Researcher] -> [Writer] -> [Critic] -- score>=7 OR max_loops --> [Finalizer] -> END
    #                                           ^              |
    #                                           |              |
    #                                           +--- <7 -------+--> [Refiner] --+
    #                                                                          |
    #                                                                          +----> [Writer]
    """

    planner_llm = llm.with_structured_output(PlannerOutput)
    critic_llm = llm.with_structured_output(CriticOutput)

    async def planner_node(state: ResearchState) -> Dict[str, Any]:
        prompt = PLANNER_PROMPT.format(topic=state["topic"])
        plan = await planner_llm.ainvoke(prompt)
        questions = _clean_questions(plan.sub_questions)
        if len(questions) < 4:
            fallback = [
                f"What is the current state of {state['topic']}?",
                f"What are the major drivers and trends in {state['topic']}?",
                f"What are the key risks and limitations in {state['topic']}?",
                f"What are practical recommendations for {state['topic']}?",
            ]
            questions = fallback
        logger.info("Planner generated %d sub-questions", len(questions))
        return {"sub_questions": questions}

    async def _search_one(sub_question: str) -> Dict[str, Any]:
        """Execute a single Tavily query in a thread to keep event loop responsive."""
        response = await asyncio.to_thread(
            tavily_client.search,
            query=sub_question,
            max_results=settings.tavily_max_results,
            include_answer=True,
            include_raw_content=False,
        )
        sources = [
            {
                "title": result.get("title", ""),
                "url": result.get("url", ""),
                "snippet": result.get("content", ""),
            }
            for result in response.get("results", [])
        ]
        return {
            "sub_question": sub_question,
            "summary": response.get("answer", ""),
            "sources": sources,
        }

    async def researcher_node(state: ResearchState) -> Dict[str, Any]:
        sub_questions = state.get("sub_questions", [])
        if not sub_questions:
            return {"research_data": [], "rag_context": ""}

        tasks = [_search_one(question) for question in sub_questions]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        research_data: List[Dict[str, Any]] = []
        for question, result in zip(sub_questions, results):
            if isinstance(result, Exception):
                logger.exception("Tavily query failed for question: %s", question)
                research_data.append(
                    {
                        "sub_question": question,
                        "summary": "",
                        "sources": [],
                        "error": str(result),
                    }
                )
            else:
                research_data.append(result)
        logger.info("Researcher finished %d search blocks", len(research_data))

        # ── RAG: index new research and retrieve past knowledge ──
        rag = RAGService.get_instance()
        rag.index_research(state["topic"], research_data)

        rag_results = rag.retrieve(state["topic"], n_results=10)
        rag_context = "\n\n".join(
            r["text"] for r in rag_results
        ) if rag_results else "No past knowledge available."
        logger.info("RAG retrieved %d relevant chunks (kb size: %d)",
                     len(rag_results), rag.document_count)

        return {"research_data": research_data, "rag_context": rag_context}

    async def writer_node(state: ResearchState) -> Dict[str, Any]:
        prompt = WRITER_PROMPT.format(
            topic=state["topic"],
            sub_questions="\n".join(f"- {q}" for q in state.get("sub_questions", [])),
            research_data=_render_sources(state.get("research_data", [])),
            rag_context=state.get("rag_context", "No past knowledge available."),
        )
        response = await llm.ainvoke(prompt)
        return {"draft_report": response.content}

    async def critic_node(state: ResearchState) -> Dict[str, Any]:
        prompt = CRITIC_PROMPT.format(
            topic=state["topic"],
            draft_report=state.get("draft_report", ""),
            research_data=_render_sources(state.get("research_data", [])),
        )
        critique = await critic_llm.ainvoke(prompt)
        new_iteration = state.get("iteration_count", 0) + 1
        logger.info(
            "Critic score=%s iteration=%s", critique.score, new_iteration
        )
        return {
            "score": int(critique.score),
            "critique": critique.critique.strip(),
            "iteration_count": new_iteration,
        }

    async def refiner_node(state: ResearchState) -> Dict[str, Any]:
        prompt = REFINER_PROMPT.format(
            topic=state["topic"],
            draft_report=state.get("draft_report", ""),
            critique=state.get("critique", ""),
            research_data=_render_sources(state.get("research_data", [])),
            rag_context=state.get("rag_context", "No past knowledge available."),
        )
        response = await llm.ainvoke(prompt)
        return {"draft_report": response.content}

    async def finalizer_node(state: ResearchState) -> Dict[str, Any]:
        score = state.get("score", 0)
        draft_report = state.get("draft_report", "")
        if score >= settings.min_quality_score:
            final_report = draft_report
        else:
            final_report = (
                f"{draft_report}\n\n---\n"
                f"Quality note: Max iterations ({settings.max_iterations}) reached. "
                f"Latest score: {score}/10.\n"
                f"Latest critique:\n{state.get('critique', 'No critique available.')}"
            )
        return {"final_report": final_report}

    def route_after_critic(state: ResearchState) -> Literal["refine", "finalize"]:
        score = state.get("score", 0)
        loops = state.get("iteration_count", 0)
        if score >= settings.min_quality_score:
            return "finalize"
        if loops >= settings.max_iterations:
            return "finalize"
        return "refine"

    graph_builder = StateGraph(ResearchState)
    graph_builder.add_node("planner", planner_node)
    graph_builder.add_node("researcher", researcher_node)
    graph_builder.add_node("writer", writer_node)
    graph_builder.add_node("critic", critic_node)
    graph_builder.add_node("refiner", refiner_node)
    graph_builder.add_node("finalizer", finalizer_node)

    graph_builder.add_edge(START, "planner")
    graph_builder.add_edge("planner", "researcher")
    graph_builder.add_edge("researcher", "writer")
    graph_builder.add_edge("writer", "critic")
    graph_builder.add_conditional_edges(
        "critic",
        route_after_critic,
        {"refine": "refiner", "finalize": "finalizer"},
    )
    graph_builder.add_edge("refiner", "writer")
    graph_builder.add_edge("finalizer", END)

    return graph_builder.compile()
