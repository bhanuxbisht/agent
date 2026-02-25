import ReactMarkdown from "react-markdown";

function renderResearchCards(researchData) {
  if (!researchData?.length) return <p className="text-sm text-slate-600">No research data yet.</p>;

  return (
    <div className="space-y-3">
      {researchData.map((item, idx) => (
        <article key={`${item.sub_question}-${idx}`} className="rounded-lg bg-white/70 p-3">
          <h4 className="font-heading text-sm text-ink">{item.sub_question}</h4>
          {item.summary ? <p className="mt-2 text-sm text-slate-700">{item.summary}</p> : null}
          <div className="mt-2 text-xs text-slate-600">
            Sources: {item.sources?.length || 0}
          </div>
        </article>
      ))}
    </div>
  );
}

export default function ReportViewer({ state, hasReport, running }) {
  const reportText = state.final_report || state.draft_report;

  return (
    <section className="glass-panel animate-riseIn rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl text-ink">Report Workspace</h2>
        <span className="rounded-full bg-pine/15 px-3 py-1 font-heading text-xs uppercase tracking-[0.12em] text-pine">
          {running ? "Streaming" : "Idle"}
        </span>
      </div>

      <div className="mt-4">
        <h3 className="font-heading text-sm uppercase tracking-[0.12em] text-slate-700">
          Planner Output
        </h3>
        {state.sub_questions?.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {state.sub_questions.map((question, idx) => (
              <li key={`${question}-${idx}`}>{question}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Waiting for planner...</p>
        )}
      </div>

      <div className="mt-4">
        <h3 className="font-heading text-sm uppercase tracking-[0.12em] text-slate-700">
          Research Highlights
        </h3>
        <div className="mt-2">{renderResearchCards(state.research_data)}</div>
      </div>

      <div className="mt-4 rounded-xl bg-white/60 p-3">
        <h3 className="font-heading text-sm uppercase tracking-[0.12em] text-slate-700">
          Critic Feedback
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
          {state.critique || "Waiting for critic..."}
        </p>
      </div>

      <div className="mt-4">
        <h3 className="font-heading text-sm uppercase tracking-[0.12em] text-slate-700">
          {state.final_report ? "Final Report" : "Draft Report"}
        </h3>
        {hasReport ? (
          <article className="prose prose-slate mt-3 max-w-none rounded-xl bg-white/75 p-4">
            <ReactMarkdown>{reportText}</ReactMarkdown>
          </article>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Draft will appear here as agents work.</p>
        )}
      </div>
    </section>
  );
}
