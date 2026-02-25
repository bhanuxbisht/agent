import { useEffect, useMemo, useRef, useState } from "react";
import AgentTimeline from "./components/AgentTimeline";
import ReportViewer from "./components/ReportViewer";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const INITIAL_STATE = {
  topic: "",
  sub_questions: [],
  research_data: [],
  draft_report: "",
  critique: "",
  score: 0,
  iteration_count: 0,
  final_report: ""
};

function parseStreamData(event) {
  try {
    return JSON.parse(event.data);
  } catch {
    return null;
  }
}

export default function App() {
  const [topic, setTopic] = useState(
    "How can SaaS companies use multi-agent AI systems in customer support?"
  );
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [timeline, setTimeline] = useState([]);
  const [state, setState] = useState(INITIAL_STATE);

  const sourceRef = useRef(null);

  const hasReport = useMemo(() => Boolean(state.final_report || state.draft_report), [state]);

  const closeSource = () => {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
  };

  const startStream = (event) => {
    event.preventDefault();
    const cleanTopic = topic.trim();
    if (!cleanTopic) return;

    closeSource();
    setError("");
    setRunning(true);
    setTimeline([]);
    setState({ ...INITIAL_STATE, topic: cleanTopic });

    const url = `${API_BASE_URL}/api/report/stream?topic=${encodeURIComponent(cleanTopic)}`;
    const source = new EventSource(url);
    sourceRef.current = source;

    source.addEventListener("start", (evt) => {
      const payload = parseStreamData(evt);
      setTimeline((prev) => [
        ...prev,
        {
          type: "start",
          label: payload?.message || "Workflow started",
          at: new Date().toISOString()
        }
      ]);
    });

    source.addEventListener("node", (evt) => {
      const payload = parseStreamData(evt);
      if (!payload) return;
      setTimeline((prev) => [
        ...prev,
        {
          type: "node",
          node: payload.node,
          patch: payload.patch,
          at: new Date().toISOString()
        }
      ]);
      if (payload.state) {
        setState(payload.state);
      }
    });

    source.addEventListener("done", (evt) => {
      const payload = parseStreamData(evt);
      if (payload?.state) {
        setState(payload.state);
      }
      setTimeline((prev) => [
        ...prev,
        {
          type: "done",
          label: "Workflow finished",
          at: new Date().toISOString()
        }
      ]);
      setRunning(false);
      closeSource();
    });

    source.addEventListener("error", (evt) => {
      const payload = parseStreamData(evt);
      if (payload?.message) {
        setError(payload.message);
      }
      setRunning(false);
      closeSource();
    });

    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) return;
      setError("Streaming connection dropped. Retry the request.");
      setRunning(false);
      closeSource();
    };
  };

  useEffect(() => () => closeSource(), []);

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-8">
      <header className="animate-riseIn">
        <p className="font-heading text-sm uppercase tracking-[0.22em] text-pine">
          LangGraph + Groq + Tavily
        </p>
        <h1 className="mt-2 font-heading text-4xl leading-tight text-ink sm:text-5xl">
          Multi-Agent Research Reporter
        </h1>
        <p className="mt-3 max-w-3xl text-lg text-slate-700">
          Planner, Researcher, Writer, Critic, and Refiner collaborate in a shared state graph
          and stream progress live.
        </p>
      </header>

      <form onSubmit={startStream} className="glass-panel mt-6 animate-riseIn rounded-2xl p-5">
        <label className="font-heading text-sm uppercase tracking-[0.18em] text-ember">
          Research Topic
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white/80 px-4 py-3 text-base outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/30"
            placeholder="Type a topic..."
          />
          <button
            type="submit"
            disabled={running}
            className="rounded-xl bg-pine px-6 py-3 font-heading text-sm uppercase tracking-[0.16em] text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? "Running..." : "Generate Report"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </form>

      <main className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_1.45fr]">
        <AgentTimeline timeline={timeline} state={state} running={running} />
        <ReportViewer state={state} hasReport={hasReport} running={running} />
      </main>
    </div>
  );
}
