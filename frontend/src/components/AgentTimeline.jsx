import { useState } from "react";

const AGENTS = [
  { id: "planner",    label: "Planning",    desc: "Initializing research plan..." },
  { id: "researcher", label: "Searching",   desc: "Executing search queries and gathering context..." },
  { id: "writer",     label: "Drafting",    desc: "Drafting structured markdown report..." },
  { id: "critic",     label: "Reviewing",   desc: "Scoring and reviewing the draft..." },
  { id: "refiner",    label: "Refining",    desc: "Strengthening weak sections..." },
  { id: "finalizer",  label: "Generating Report", desc: "Generating final report..." },
];

function getStatus(id, running, currentNode, seenNodes) {
  if (seenNodes.has(id)) return "done";
  if (running && currentNode === id) return "active";
  if (running && !currentNode && id === "planner") return "active";
  return "pending";
}

export default function AgentTimeline({ timeline, state, running, elapsed }) {
  const [isOpen, setIsOpen] = useState(true);
  const nodeEvents = timeline.filter((e) => e.type === "node");
  const seenNodes = new Set(nodeEvents.map((e) => e.node));
  const currentNode = nodeEvents.length ? nodeEvents[nodeEvents.length - 1].node : "";

  return (
    <div className="w-full animate-slide-up mb-6">
      <div className="glass-subtle rounded-3xl p-6 shadow-soft">
        {/* Header */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 mb-2 text-sm font-medium text-ink/70 hover:text-ink transition-colors w-full text-left"
        >
          <svg 
            className={`h-4 w-4 transition-transform duration-300 ${isOpen ? "" : "-rotate-90"}`} 
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          Reasoning Trace <span className="text-ink/40 font-normal">({elapsed || 0}s)</span>
        </button>

        {/* Steps */}
        {isOpen && (
          <div className="space-y-6 pl-2 mt-6">
            {AGENTS.map((agent, idx) => {
              const status = getStatus(agent.id, running, currentNode, seenNodes);
              
              // Hide pending steps to match the clean look, or show them faded
              if (status === "pending" && !running) return null;

              return (
                <div key={agent.id} className={`flex gap-4 transition-all duration-500 ${status === "pending" ? "opacity-40" : "opacity-100"}`}>
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {status === "done" ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-500 text-emerald-500">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : status === "active" ? (
                      <div className="flex h-5 w-5 items-center justify-center text-accent">
                        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full border border-ink/20 text-ink/20">
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${status === "active" ? "text-ink" : "text-ink/80"}`}>
                        {agent.label}
                      </h3>
                      {status === "done" && (
                        <span className="text-xs text-ink/40">{elapsed ? (elapsed / 6).toFixed(1) : "1.2"}s</span>
                      )}
                    </div>
                    
                    {(status === "active" || status === "done") && (
                      <div className="mt-1 text-sm text-ink/60 italic">
                        {agent.desc}
                      </div>
                    )}

                    {/* If it's the researcher, show some mock query icons if done or active */}
                    {agent.id === "researcher" && (status === "active" || status === "done") && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex h-6 w-6 items-center justify-center rounded-full bg-white border border-mist shadow-sm text-[10px]">
                              🔍
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-ink/40 bg-white/50 px-2 py-1 rounded-full border border-mist">
                          +{state.research_data?.length || 5} sources
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
