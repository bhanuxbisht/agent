import { useState } from "react";

const AGENTS = [
  { id: "analyzer",         label: "Analyzing Brief",      desc: "Breaking down content type, audience, and creative goals..." },
  { id: "script_writer",    label: "Writing Script",       desc: "Crafting narration, dialogue, and visual cues..." },
  { id: "timeline_planner", label: "Planning Timeline",    desc: "Mapping shot-by-shot production schedule..." },
  { id: "enhancer",         label: "Enhancing",            desc: "Adding hooks, music cues, hashtags, CTAs..." },
  { id: "story_architect",  label: "Architecting Story",   desc: "Structuring narrative arc and emotional beats..." },
  { id: "critic",           label: "Reviewing",            desc: "Scoring quality and identifying improvements..." },
  { id: "refiner",          label: "Refining",             desc: "Strengthening weak sections based on critique..." },
  { id: "finalizer",        label: "Generating Blueprint", desc: "Assembling final production blueprint..." },
];

function getStatus(id, running, currentNode, seenNodes) {
  if (seenNodes.has(id)) return "done";
  if (running && currentNode === id) return "active";
  if (running && !currentNode && id === "analyzer") return "active";
  return "pending";
}

export default function AgentTimeline({ timeline, state, running, elapsed }) {
  const [isOpen, setIsOpen] = useState(true);
  const nodeEvents = timeline.filter((e) => e.type === "node");
  const seenNodes = new Set(nodeEvents.map((e) => e.node));
  const currentNode = nodeEvents.length ? nodeEvents[nodeEvents.length - 1].node : "";

  const doneCount = AGENTS.filter((a) => seenNodes.has(a.id)).length;

  return (
    <div className="w-full animate-slide-up mb-6">
      <div className="glass-subtle rounded-2xl p-5">
        {/* Header */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm font-medium text-ink/60 hover:text-ink transition-colors w-full text-left"
        >
          <svg
            className={`h-4 w-4 transition-transform duration-300 ${isOpen ? "" : "-rotate-90"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          Production Pipeline
          <span className="text-ink/30 font-normal ml-1">
            {doneCount}/{AGENTS.length} &middot; {elapsed || 0}s
          </span>
        </button>

        {/* Steps */}
        {isOpen && (
          <div className="space-y-5 pl-2 mt-5">
            {AGENTS.map((agent) => {
              const status = getStatus(agent.id, running, currentNode, seenNodes);
              if (status === "pending" && !running) return null;

              return (
                <div
                  key={agent.id}
                  className={`flex gap-4 transition-all duration-500 ${status === "pending" ? "opacity-30" : "opacity-100"}`}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {status === "done" ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-400 text-emerald-400">
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
                      <div className="flex h-5 w-5 items-center justify-center rounded-full border border-ink/15" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${status === "active" ? "text-ink" : "text-ink/70"}`}>
                        {agent.label}
                      </h3>
                    </div>
                    {(status === "active" || status === "done") && (
                      <p className="mt-1 text-sm text-ink/40 italic">{agent.desc}</p>
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
