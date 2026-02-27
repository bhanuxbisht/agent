import { useState } from "react";
import ReactMarkdown from "react-markdown";

/* ── Download helper ── */
function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Research cards ── */
function ResearchCards({ data }) {
  if (!data?.length)
    return <p className="py-10 text-center text-sm text-ink/30">No research data yet.</p>;

  return (
    <div className="space-y-3">
      {data.map((item, idx) => (
        <article
          key={`${item.sub_question}-${idx}`}
          className="glass-subtle rounded-2xl p-4 animate-slide-up transition-all duration-300 hover:bg-white/50"
          style={{ animationDelay: `${idx * 60}ms` }}
        >
          <h4 className="text-sm font-semibold text-ink/80">{item.sub_question}</h4>
          {item.summary && (
            <p className="mt-2 text-sm leading-relaxed text-ink/50">{item.summary}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.sources?.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-[200px] items-center gap-1 truncate rounded-lg bg-accent/8 px-2.5 py-1 text-[11px] text-accent font-medium transition-all duration-200 hover:bg-accent/15 hover:scale-[1.02]"
              >
                {src.title || "Source"}
                <svg className="h-2.5 w-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

/* ── Tabs ── */
const TABS = [
  { id: "research", label: "Research", icon: "\u{1F50D}" },
  { id: "report",   label: "Report",   icon: "\u{1F4C4}" },
  { id: "critique",  label: "Critique", icon: "\u{1F3AF}" },
];

export default function ReportViewer({ state, hasReport, running }) {
  const [tab, setTab] = useState("research");
  const reportText = state.final_report || state.draft_report;

  return (
    <section className="glass rounded-2xl p-5 animate-slide-up">
      {/* Header: tabs + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/[0.06] pb-3">
        <div className="flex gap-1 rounded-xl bg-mist/30 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-all duration-300 ${
                tab === t.id
                  ? "bg-white/80 text-accent shadow-soft"
                  : "text-ink/40 hover:bg-white/40 hover:text-ink/60"
              }`}
            >
              <span className="mr-1">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {running && (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-accent animate-soft-pulse">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              Streaming
            </span>
          )}
          <button
            onClick={() => reportText && downloadText(reportText, `${state.topic || "report"}.md`)}
            disabled={!reportText}
            className="glass-subtle rounded-xl px-3 py-1.5 text-[11px] font-semibold text-ink/50 transition-all duration-200 hover:bg-white/60 hover:text-ink/70 disabled:opacity-25"
          >
            &#8595; Download .md
          </button>
          <button
            onClick={() => window.print()}
            disabled={!reportText}
            className="glass-subtle rounded-xl px-3 py-1.5 text-[11px] font-semibold text-ink/50 transition-all duration-200 hover:bg-white/60 hover:text-ink/70 disabled:opacity-25"
          >
            &#128438; Print PDF
          </button>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="mt-5 min-h-[420px]">

        {/* RESEARCH TAB */}
        {tab === "research" && (
          <div className="animate-slide-up space-y-5">
            {state.sub_questions?.length > 0 && (
              <div>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink/40">
                  Planner Output &mdash; {state.sub_questions.length} Sub-questions
                </h3>
                <div className="space-y-1">
                  {state.sub_questions.map((q, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 rounded-xl bg-white/40 px-3 py-2 text-sm text-ink/70 transition-all duration-200 hover:bg-white/60"
                    >
                      <span className="mt-0.5 flex-shrink-0 font-mono text-[11px] font-bold text-accent">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {q}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink/40">
                Research Results
              </h3>
              <ResearchCards data={state.research_data} />
            </div>
          </div>
        )}

        {/* REPORT TAB */}
        {tab === "report" && (
          <div className="animate-slide-up">
            {hasReport ? (
              <>
                <div className="mb-4 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                      state.final_report
                        ? "bg-emerald-100/60 text-emerald-700"
                        : "bg-amber-100/60 text-amber-700"
                    }`}
                  >
                    {state.final_report ? "FINAL" : "DRAFT"}
                  </span>
                  {state.score > 0 && (
                    <span className="text-[11px] text-ink/40">
                      Quality: <span className="font-semibold text-ink/70">{state.score}/10</span>
                    </span>
                  )}
                </div>
                <article className="prose prose-sm max-w-none rounded-2xl bg-white/40 p-6 prose-headings:text-ink prose-p:text-ink/60 prose-p:leading-relaxed prose-a:text-accent prose-strong:text-ink/80 prose-li:text-ink/60 prose-li:leading-relaxed">
                  <ReactMarkdown>{reportText}</ReactMarkdown>
                </article>
              </>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center gap-3 animate-float">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/50">
                  <span className="text-2xl">&#128196;</span>
                </div>
                <p className="text-sm text-ink/35">
                  {running
                    ? "Report is being generated by agents..."
                    : "Enter a topic and click Generate Report"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* CRITIQUE TAB */}
        {tab === "critique" && (
          <div className="animate-slide-up">
            {state.critique ? (
              <div className="space-y-5">
                {/* Metric cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="glass-subtle rounded-2xl p-4 text-center transition-transform duration-300 hover:scale-[1.03]">
                    <p className="text-3xl font-extrabold text-accent">{state.score}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink/35">Score</p>
                  </div>
                  <div className="glass-subtle rounded-2xl p-4 text-center transition-transform duration-300 hover:scale-[1.03]">
                    <p className="text-3xl font-extrabold text-violet-500">{state.iteration_count}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink/35">Iterations</p>
                  </div>
                  <div className="glass-subtle rounded-2xl p-4 text-center transition-transform duration-300 hover:scale-[1.03]">
                    <p className="text-3xl font-extrabold text-emerald-600">
                      {state.research_data?.reduce((a, b) => a + (b.sources?.length || 0), 0) || 0}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink/35">Sources</p>
                  </div>
                </div>

                {/* Feedback */}
                <div className="glass-subtle rounded-2xl p-5">
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink/40">
                    Critic Feedback
                  </h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/60">
                    {state.critique}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center gap-3 animate-float">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/50">
                  <span className="text-2xl">&#127919;</span>
                </div>
                <p className="text-sm text-ink/35">Waiting for critic evaluation...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
