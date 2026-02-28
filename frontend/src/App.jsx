import { useEffect, useMemo, useRef, useState } from "react";
import AgentTimeline from "./components/AgentTimeline";
import BlueprintViewer from "./components/BlueprintViewer";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const CONTENT_TYPES = [
  { value: "reel", label: "Reel / Short" },
  { value: "youtube", label: "YouTube Video" },
  { value: "podcast", label: "Podcast Episode" },
  { value: "film", label: "Short Film" },
  { value: "music_video", label: "Music Video" },
];

const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "general", label: "General" },
];

const EXAMPLES = [
  { text: "30s cinematic reel about monsoon in Jaipur", type: "reel", duration: 30, platform: "instagram" },
  { text: "10-min YouTube tutorial: perfect butter chicken", type: "youtube", duration: 600, platform: "youtube" },
  { text: "3-min indie music video in neon-lit alleyways", type: "music_video", duration: 180, platform: "youtube" },
  { text: "60s travel reel: sunrise at Pangong Lake", type: "reel", duration: 60, platform: "instagram" },
];

const INITIAL_STATE = {
  prompt: "",
  content_type: "reel",
  duration_seconds: 30,
  platform: "instagram",
  analysis: null,
  script: "",
  timeline: [],
  enhancements: null,
  story_structure: null,
  critique: "",
  score: 0,
  iteration_count: 0,
  final_blueprint: "",
};

function GlassSelect({ value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative" ref={ref} style={{ zIndex: isOpen ? 100 : 1 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`glass-subtle flex items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-xs font-medium text-ink/90 outline-none transition-all hover:bg-white/10 min-w-[140px] ${isOpen ? 'bg-white/10' : ''}`}
      >
        <span>{selected.label}</span>
        <svg
          className={`h-3 w-3 text-ink/50 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-2 w-full min-w-[180px] overflow-hidden rounded-xl border border-white/10 bg-[#0f0f1a] shadow-2xl animate-slide-up z-[60]">
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center px-4 py-3 text-left text-xs font-medium transition-colors ${
                  value === option.value
                    ? "bg-accent text-white"
                    : "text-ink/70 hover:bg-white/5 hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function parseStreamData(event) {
  try {
    return JSON.parse(event.data);
  } catch {
    return null;
  }
}

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState("reel");
  
  // Time controls
  const [timeValue, setTimeValue] = useState(30);
  const [timeUnit, setTimeUnit] = useState("sec"); // "sec" or "min"
  
  const [platform, setPlatform] = useState("instagram");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [timeline, setTimeline] = useState([]);
  const [state, setState] = useState(INITIAL_STATE);
  const [elapsed, setElapsed] = useState(0);

  const sourceRef = useRef(null);
  const timerRef = useRef(null);

  const finalDurationSec = timeUnit === "min" ? timeValue * 60 : timeValue;

  const hasBlueprint = useMemo(
    () => Boolean(state.final_blueprint || state.script),
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
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;

    closeSource();
    setError("");
    setRunning(true);
    setTimeline([]);
    setState({
      ...INITIAL_STATE,
      prompt: cleanPrompt,
      content_type: contentType,
      duration_seconds: finalDurationSec,
      platform,
    });
    setElapsed(0);

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.round((Date.now() - startTime) / 1000));
    }, 1000);

    const params = new URLSearchParams({
      prompt: cleanPrompt,
      content_type: contentType,
      duration: String(finalDurationSec),
      platform,
    });
    const url = `${API_BASE_URL}/api/create/stream?${params}`;
    const source = new EventSource(url);
    sourceRef.current = source;

    source.addEventListener("start", (evt) => {
      const payload = parseStreamData(evt);
      setTimeline((prev) => [
        ...prev,
        { type: "start", label: payload?.message || "Pipeline started", at: new Date().toISOString() },
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
        { type: "done", label: "Blueprint ready", at: new Date().toISOString() },
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

  const isInitial = !running && timeline.length === 0 && !hasBlueprint;

  /* ─────────────────── LANDING VIEW ─────────────────── */
  if (isInitial) {
    return (
      <div className="relative flex min-h-screen flex-col items-center pt-40 pb-32 p-6 text-ink">
        {/* Logo */}
        <div className="mb-10 flex items-center gap-3 animate-slide-up">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl glass-strong overflow-hidden transition-transform duration-300 hover:scale-105 shadow-2xl">
            <span className="relative text-3xl font-black tracking-tighter text-white drop-shadow-lg">bb</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
            bb <span className="font-light text-white/50">/create</span>
          </h1>
        </div>

        {/* Main Form */}
        <div className="w-full max-w-3xl animate-slide-up" style={{ animationDelay: "100ms" }}>
          <form
            onSubmit={startStream}
            className="glass relative flex flex-col rounded-3xl p-5 transition-all duration-300 focus-within:shadow-glass-lg"
          >
            {/* Prompt */}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  startStream(e);
                }
              }}
              className="w-full resize-none bg-transparent px-4 py-4 text-lg text-ink placeholder-ink/30 outline-none"
              placeholder="Describe your content vision..."
              rows={3}
            />

            {/* Controls Row */}
            <div className="flex flex-wrap items-start gap-4 px-3 pb-3 pt-4 border-t border-white/[0.06]">
              {/* Content Type */}
              <GlassSelect
                value={contentType}
                options={CONTENT_TYPES}
                onChange={setContentType}
              />

              {/* Duration Control */}
              <div className="glass-subtle flex items-center gap-1 rounded-xl p-1.5 transition-all focus-within:bg-white/5 hover:bg-white/5 relative z-0">
                <input
                  type="number"
                  value={timeValue}
                  onChange={(e) => setTimeValue(Math.max(1, Number(e.target.value)))}
                  min={1}
                  max={timeUnit === "min" ? 120 : 7200}
                  className="w-12 bg-transparent text-center text-xs font-semibold text-ink/90 outline-none"
                  placeholder="30"
                />
                <button
                  type="button"
                  onClick={() => setTimeUnit(timeUnit === "sec" ? "min" : "sec")}
                  className="h-full rounded-lg bg-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink/80 hover:bg-accent hover:text-white transition-colors"
                >
                  {timeUnit}
                </button>
              </div>

              {/* Platform */}
              <GlassSelect
                value={platform}
                options={PLATFORMS}
                onChange={setPlatform}
              />

              <div className="flex-1" />

              {/* Submit */}
              <button
                type="submit"
                disabled={!prompt.trim()}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:scale-105 hover:brightness-110 disabled:opacity-30 disabled:hover:scale-100 disabled:shadow-none"
              >
                Generate
              </button>
            </div>
          </form>

          {/* Examples */}
          <div className="mt-24 flex flex-col items-center gap-5 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <p className="flex items-center gap-2 text-sm font-medium text-ink/40">
              Try an example
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setPrompt(ex.text);
                    setContentType(ex.type);
                    if (ex.duration >= 60 && ex.duration % 60 === 0) {
                        setTimeValue(ex.duration / 60);
                        setTimeUnit("min");
                    } else {
                        setTimeValue(ex.duration);
                        setTimeUnit("sec");
                    }
                    setPlatform(ex.platform);
                  }}
                  className="glass-subtle flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-ink/60 transition-all hover:text-ink hover:border-white/20"
                >
                  {ex.text}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="absolute bottom-6 text-xs text-ink/20">
          Powered by multi-agent AI &middot; bb /create
        </p>
      </div>
    );
  }

  /* ─────────────────── RESULTS VIEW ─────────────────── */
  return (
    <div className="min-h-screen text-ink flex flex-col items-center pt-6 px-4">
      {/* ── Top Bar ── */}
      <div className="w-full flex items-center justify-between max-w-[1100px] z-50 mb-8">
        {/* Left: Brand */}
        <button
          onClick={() => { closeSource(); setRunning(false); setTimeline([]); setState(INITIAL_STATE); }}
          className="flex items-center gap-2 text-ink/70 hover:text-ink transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg glass-strong overflow-hidden">
            <span className="text-sm font-black gradient-text">bb</span>
          </div>
          <span className="text-sm font-semibold">bb <span className="font-light text-ink/40">/create</span></span>
        </button>

        {/* Center: Mini search */}
        <form onSubmit={startStream} className="w-full max-w-lg mx-6">
          <div className="glass-subtle flex items-center rounded-xl px-3 py-2 transition-all focus-within:shadow-glass">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 bg-transparent text-sm text-ink placeholder-ink/30 outline-none"
              placeholder="New creative brief..."
            />
            <button
              type="submit"
              disabled={running || !prompt.trim()}
              className="ml-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-accent/80 text-white transition-all hover:bg-accent disabled:opacity-30"
            >
              {running ? (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
            </button>
          </div>
        </form>

        {/* Right: Status */}
        <div className="flex items-center gap-3 text-sm text-ink/50">
          {running && (
            <span className="flex items-center gap-2 text-accent animate-soft-pulse">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Creating...
            </span>
          )}
          <span className="font-mono text-xs">{elapsed}s</span>
        </div>
      </div>

      {error && (
        <div className="w-full max-w-3xl mb-4">
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400 backdrop-blur">
            {error}
          </p>
        </div>
      )}

      {/* ── Content ── */}
      <main className="w-full max-w-3xl flex flex-col animate-slide-up" style={{ animationDelay: "100ms" }}>
        {/* Brief summary */}
        <div className="glass-subtle rounded-2xl px-5 py-3 mb-6 flex items-center gap-3 text-sm">
          <span className="text-accent">⚡</span>
          <span className="text-ink/60 truncate">{state.prompt}</span>
          <span className="ml-auto flex items-center gap-2 text-xs text-ink/40 flex-shrink-0">
            <span className="rounded-lg bg-accent/10 px-2 py-0.5 text-accent font-medium">
              {CONTENT_TYPES.find((c) => c.value === state.content_type)?.label || state.content_type}
            </span>
            <span>{state.duration_seconds}s</span>
            <span className="capitalize">{state.platform}</span>
          </span>
        </div>

        <AgentTimeline timeline={timeline} state={state} running={running} elapsed={elapsed} />

        {(hasBlueprint || !running) && (
          <BlueprintViewer state={state} hasBlueprint={hasBlueprint} running={running} />
        )}
      </main>
    </div>
  );
}
