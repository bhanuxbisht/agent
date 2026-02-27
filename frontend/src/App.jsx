import { useEffect, useMemo, useRef, useState } from "react";
import AgentTimeline from "./components/AgentTimeline";
import ReportViewer from "./components/ReportViewer";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const INITIAL_STATE = {
  topic: "",
  sub_questions: [],
  research_data: [],
  rag_context: "",
  draft_report: "",
  critique: "",
  score: 0,
  iteration_count: 0,
  final_report: "",
};

function parseStreamData(event) {
  try {
    return JSON.parse(event.data);
  } catch {
    return null;
  }
}

export default function App() {
  const [topic, setTopic] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [timeline, setTimeline] = useState([]);
  const [state, setState] = useState(INITIAL_STATE);
  const [elapsed, setElapsed] = useState(0);
  
  // New toggles for the UI
  const [isDeepResearch, setIsDeepResearch] = useState(true);
  const [isStructuredOutput, setIsStructuredOutput] = useState(false);

  const sourceRef = useRef(null);
  const timerRef = useRef(null);

  const hasReport = useMemo(
    () => Boolean(state.final_report || state.draft_report),
    [state]
  );

  const closeSource = () => {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
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
    setElapsed(0);

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.round((Date.now() - startTime) / 1000));
    }, 1000);

    const url = `${API_BASE_URL}/api/report/stream?topic=${encodeURIComponent(cleanTopic)}&deep=${isDeepResearch}&structured=${isStructuredOutput}`;
    const source = new EventSource(url);
    sourceRef.current = source;

    source.addEventListener("start", (evt) => {
      const payload = parseStreamData(evt);
      setTimeline((prev) => [
        ...prev,
        { type: "start", label: payload?.message || "Workflow started", at: new Date().toISOString() },
      ]);
    });

    source.addEventListener("node", (evt) => {
      const payload = parseStreamData(evt);
      if (!payload) return;
      setTimeline((prev) => [
        ...prev,
        { type: "node", node: payload.node, patch: payload.patch, at: new Date().toISOString() },
      ]);
      if (payload.state) setState(payload.state);
    });

    source.addEventListener("done", (evt) => {
      const payload = parseStreamData(evt);
      if (payload?.state) setState(payload.state);
      setTimeline((prev) => [
        ...prev,
        { type: "done", label: "Workflow finished", at: new Date().toISOString() },
      ]);
      setRunning(false);
      closeSource();
    });

    source.addEventListener("error", (evt) => {
      const payload = parseStreamData(evt);
      if (payload?.message) setError(payload.message);
      setRunning(false);
      closeSource();
    });

    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) return;
      setError("Connection lost. Please try again.");
      setRunning(false);
      closeSource();
    };
  };

  useEffect(() => () => closeSource(), []);

  const sourceCount = state.research_data?.reduce(
    (a, b) => a + (b.sources?.length || 0), 0
  ) || 0;

  const isInitial = !running && timeline.length === 0 && !hasReport;

  if (isInitial) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center p-6 text-ink">
        {/* Logo */}
        <div className="mb-12 flex items-center gap-3 animate-slide-up">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/30 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)] overflow-hidden transition-transform duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent"></div>
            <span className="relative text-2xl font-black tracking-tighter text-ink drop-shadow-md">bb</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink drop-shadow-sm">
            bb <span className="font-light text-ink/60">/research</span>
          </h1>
        </div>

        {/* Search Box */}
        <div className="w-full max-w-3xl animate-slide-up" style={{ animationDelay: "100ms" }}>
          <form
            onSubmit={startStream}
            className="glass-subtle relative flex flex-col rounded-[2rem] p-2 shadow-soft transition-all duration-300 focus-within:bg-white/70 focus-within:shadow-glass-lg"
          >
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  startStream(e);
                }
              }}
              className="w-full resize-none bg-transparent px-6 py-6 text-lg text-ink placeholder-ink/30 outline-none"
              placeholder="What would you like to research today?"
              rows={3}
            />
            <div className="flex items-center justify-between px-4 pb-3 pt-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeepResearch(!isDeepResearch)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    isDeepResearch 
                      ? "bg-white/80 text-ink shadow-sm border border-white/50" 
                      : "bg-white/30 text-ink/60 hover:bg-white/50 border border-transparent"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${isDeepResearch ? "bg-accent" : "bg-ink/30"}`}></span>
                  Deep Research
                </button>
                <button
                  type="button"
                  onClick={() => setIsStructuredOutput(!isStructuredOutput)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    isStructuredOutput 
                      ? "bg-white/80 text-ink shadow-sm border border-white/50" 
                      : "bg-white/30 text-ink/60 hover:bg-white/50 border border-transparent"
                  }`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Structured Output
                </button>
              </div>
              <button
                type="submit"
                disabled={!topic.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white transition-all hover:scale-105 hover:bg-ink/90 disabled:opacity-30 disabled:hover:scale-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            </div>
          </form>

          {/* Examples */}
          <div className="mt-10 flex flex-col items-center gap-5 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <p className="flex items-center gap-2 text-sm font-medium text-ink/50">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Try an example
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { icon: "🏢", text: "Company Research" },
                { icon: "⚔️", text: "Competitor Analysis" },
                { icon: "🎯", text: "GTM Prospect Brief" }
              ].map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setTopic(ex.text)}
                  className="glass-subtle flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-ink/70 transition-all hover:bg-white/60 hover:text-ink"
                >
                  <span className="opacity-60">{ex.icon}</span>
                  {ex.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-ink flex flex-col items-center pt-6 px-4">
      {/* ── Top Navigation (Results View) ── */}
      <div className="w-full flex items-start justify-between max-w-[1600px] z-50">
        {/* Left: Sidebar toggle (mock) */}
        <button className="p-2 text-ink/60 hover:text-ink transition-colors bg-white/30 rounded-lg backdrop-blur-md border border-white/40">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Center: Search Bar */}
        <div className="w-full max-w-2xl animate-slide-up mx-4">
          <form onSubmit={startStream} className="glass-subtle relative flex items-start rounded-2xl p-2 shadow-soft transition-all duration-300 focus-within:bg-white/70 focus-within:shadow-glass-lg">
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  startStream(e);
                }
              }}
              className="w-full resize-none bg-transparent px-4 py-3 text-sm text-ink placeholder-ink/40 outline-none"
              placeholder="What would you like to research today?"
              rows={2}
            />
            <button
              type="submit"
              disabled={running || !topic.trim()}
              className="mt-1 mr-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-ink text-white shadow-sm transition-all duration-300 hover:scale-105 hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              {running ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
            </button>
          </form>
          {error && (
            <div className="mt-2">
              <p className="rounded-xl border border-red-300/40 bg-red-50/60 px-4 py-2 text-sm text-red-600 backdrop-blur">
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Right: Developer Resources (mock) */}
        <div className="flex items-center gap-2">
          <button className="p-2 text-ink/60 hover:text-ink transition-colors bg-white/30 rounded-lg backdrop-blur-md border border-white/40">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-ink/70 hover:text-ink transition-colors bg-white/30 rounded-lg backdrop-blur-md border border-white/40">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Developer Resources
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="w-full max-w-3xl mt-12 flex flex-col animate-slide-up" style={{ animationDelay: "160ms" }}>
        {/* Logo and Status */}
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white/30 backdrop-blur-xl border border-white/60 shadow-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent"></div>
            <span className="relative text-sm font-black tracking-tighter text-ink drop-shadow-sm">bb</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-ink">bb</h2>
          {running && (
            <div className="flex items-center gap-2 text-ink/60 ml-2">
              <svg className="h-4 w-4 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">researching...</span>
            </div>
          )}
        </div>

        <AgentTimeline timeline={timeline} state={state} running={running} elapsed={elapsed} />
        
        {(hasReport || !running) && (
          <ReportViewer state={state} hasReport={hasReport} running={running} />
        )}
      </main>
    </div>
  );
}
