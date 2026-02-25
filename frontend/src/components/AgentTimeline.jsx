const AGENT_FLOW = [
  { id: "planner", label: "Planner Agent" },
  { id: "researcher", label: "Researcher Agent" },
  { id: "writer", label: "Writer Agent" },
  { id: "critic", label: "Critic Agent" },
  { id: "refiner", label: "Refiner Agent (loop only)" },
  { id: "finalizer", label: "Finalizer" }
];

function statusForAgent(agentId, running, currentNode, seenNodes) {
  if (seenNodes.has(agentId)) return "done";
  if (running && currentNode === agentId) return "active";
  if (running && !currentNode && agentId === "planner") return "active";
  return "pending";
}

export default function AgentTimeline({ timeline, state, running }) {
  const nodeEvents = timeline.filter((event) => event.type === "node");
  const seenNodes = new Set(nodeEvents.map((event) => event.node));
  const currentNode = nodeEvents.length > 0 ? nodeEvents[nodeEvents.length - 1].node : "";
  const recent = timeline.slice(-8).reverse();

  return (
    <section className="glass-panel animate-riseIn rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl text-ink">Agent Progress</h2>
        <p className="font-heading text-xs uppercase tracking-[0.14em] text-slate-600">
          Iteration: {state.iteration_count} | Score: {state.score || "-"}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {AGENT_FLOW.map((agent) => {
          const status = statusForAgent(agent.id, running, currentNode, seenNodes);
          return (
            <article
              key={agent.id}
              className={`rounded-xl border px-4 py-3 transition ${
                status === "done"
                  ? "border-moss/35 bg-moss/10"
                  : status === "active"
                    ? "animate-pulseLine border-ember/35 bg-ember/10"
                    : "border-slate-300/60 bg-white/45"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-base">{agent.label}</h3>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${
                    status === "done"
                      ? "bg-moss/20 text-moss"
                      : status === "active"
                        ? "bg-ember/20 text-ember"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {status}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-6">
        <h3 className="font-heading text-sm uppercase tracking-[0.12em] text-slate-700">
          Live Event Log
        </h3>
        <ul className="mt-2 space-y-2 text-sm text-slate-700">
          {recent.length === 0 ? (
            <li>No events yet.</li>
          ) : (
            recent.map((event, idx) => (
              <li key={`${event.at}-${idx}`} className="rounded-lg bg-white/60 px-3 py-2">
                {event.type === "node" ? (
                  <span>
                    <strong>{event.node}</strong> updated shared state
                  </span>
                ) : (
                  <span>{event.label}</span>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
