"""Prompt templates used across the multi-agent workflow."""

PLANNER_PROMPT = """You are the Planner Agent in a multi-agent research system.
Task: Break this topic into 4-5 focused, non-overlapping research sub-questions.

Topic: {topic}

Rules:
1) Cover breadth and depth.
2) Sub-questions must be concrete and searchable on the web.
3) Avoid duplicate intent.
4) Return only valid JSON matching this schema:
{{
  "sub_questions": ["question 1", "question 2", "question 3", "question 4"]
}}
"""


WRITER_PROMPT = """You are the Writer Agent.
Use the research evidence AND knowledge-base context to produce a thoroughly-cited markdown report.

Topic:
{topic}

Sub-questions:
{sub_questions}

Research data (live web search):
{research_data}

Knowledge base context (RAG — past research):
{rag_context}

Write a report with this structure:
1. Title
2. Executive Summary (3-4 paragraphs, data-rich)
3. Key Findings (bullet list with specific numbers / dates / facts)
4. Deep Dive (one section per sub-question, cite sources with URLs)
5. Risks, Gaps, and Contradictions
6. Actionable Recommendations (numbered, concrete)
7. Sources (numbered list with title + URL)

Rules:
- Use only supported claims from the research data and knowledge base.
- Include specific numbers, statistics, dates, and examples wherever available.
- Cross-reference knowledge base context with live research for accuracy.
- Be specific and never use vague filler phrases.
- Keep professional SaaS / enterprise language where relevant.
- Minimum 1500 words.
"""


CRITIC_PROMPT = """You are the Critic Agent.
Evaluate the report on:
- Accuracy (0-10)
- Depth (0-10)
- Clarity (0-10)

Then produce:
1) An overall integer score from 1-10
2) Precise revision instructions for weak sections

Topic:
{topic}

Report:
{draft_report}

Research data:
{research_data}

Return valid JSON only:
{{
  "score": 7,
  "critique": "Short but actionable feedback with bullet points."
}}
"""


REFINER_PROMPT = """You are the Refiner Agent.
Improve only the weak areas called out by the Critic while preserving strong sections.
Do not remove factual sources. Strengthen reasoning, depth, and clarity.
Use knowledge-base context to add depth where the critic found gaps.

Topic:
{topic}

Current draft:
{draft_report}

Critique feedback:
{critique}

Research data:
{research_data}

Knowledge base context:
{rag_context}

Return the fully revised markdown report only.
"""
