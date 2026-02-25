# Multi-Agent Research Reporter

Production-ready starter app using:
- LangGraph (StateGraph orchestration)
- Groq (`llama-3.3-70b-versatile`) for all agents
- Tavily for web search
- FastAPI backend with SSE streaming
- React + Tailwind frontend
- Docker + Docker Compose deployment

## Quick Start

1. Create `.env` from `.env.example`.
2. Run:

```bash
docker compose up --build
```

3. Open:
- Frontend: `http://localhost`
- Backend docs: `http://localhost:8000/docs`

## Agent Roles
- Planner: creates 4-5 sub-questions
- Researcher: gathers web evidence via Tavily
- Writer: drafts markdown report
- Critic: scores quality and gives feedback
- Refiner: improves weak sections based on feedback

Critic loop stops when score >= 7 or max 3 iterations.
