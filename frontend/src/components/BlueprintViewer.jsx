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

/* ── Tabs ── */
const TABS = [
  { id: "blueprint", label: "Blueprint", icon: "⚡" },
  { id: "script",    label: "Script",    icon: "📝" },
  { id: "timeline",  label: "Timeline",  icon: "🎬" },
  { id: "enhance",   label: "Enhance",   icon: "✨" },
  { id: "story",     label: "Story Arc", icon: "📐" },
  { id: "critique",  label: "Critique",  icon: "🎯" },
];

/* ── Timeline Shot Card ── */
function ShotCard({ shot, index }) {
  return (
    <div className="glass-subtle rounded-xl p-4 animate-slide-up transition-all hover:border-accent/20" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/15 text-xs font-bold text-accent">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-sm font-semibold text-ink/80">{shot.shot_type || shot.type || `Shot ${index + 1}`}</span>
        </span>
        {shot.duration && (
          <span className="text-xs text-ink/40 bg-white/[0.06] px-2 py-0.5 rounded-lg">{shot.duration}</span>
        )}
      </div>
      {shot.description && <p className="text-sm text-ink/50 leading-relaxed">{shot.description}</p>}
      {shot.camera && <p className="mt-1 text-xs text-accent/60">📷 {shot.camera}</p>}
      {shot.audio && <p className="mt-0.5 text-xs text-pink-400/60">🎵 {shot.audio}</p>}
      {shot.notes && <p className="mt-1 text-xs text-ink/30 italic">{shot.notes}</p>}
    </div>
  );
}

/* ── Enhancement Section ── */
function EnhancementSection({ title, icon, items }) {
  if (!items || (Array.isArray(items) && items.length === 0)) return null;
  return (
    <div className="glass-subtle rounded-xl p-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-ink/40 mb-3">
        {icon} {title}
      </h4>
      {Array.isArray(items) ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span key={i} className="rounded-lg bg-accent/10 px-3 py-1 text-xs font-medium text-accent/80">
              {typeof item === "string" ? item : JSON.stringify(item)}
            </span>
          ))}
        </div>
      ) : typeof items === "string" ? (
        <p className="text-sm text-ink/60">{items}</p>
      ) : (
        <pre className="text-xs text-ink/50 whitespace-pre-wrap">{JSON.stringify(items, null, 2)}</pre>
      )}
    </div>
  );
}

export default function BlueprintViewer({ state, hasBlueprint, running }) {
  const [tab, setTab] = useState("blueprint");
  const blueprintText = state.final_blueprint || "";

  return (
    <section className="glass rounded-2xl p-5 animate-slide-up">
      {/* Header: tabs + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-all duration-300 whitespace-nowrap ${
                tab === t.id
                  ? "bg-accent/20 text-accent shadow-soft"
                  : "text-ink/35 hover:bg-white/[0.06] hover:text-ink/60"
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
            onClick={() => blueprintText && downloadText(blueprintText, "blueprint.md")}
            disabled={!blueprintText}
            className="glass-subtle rounded-xl px-3 py-1.5 text-[11px] font-semibold text-ink/40 transition-all duration-200 hover:text-ink/60 disabled:opacity-25"
          >
            ↓ Download .md
          </button>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="mt-5 min-h-[420px]">

        {/* BLUEPRINT TAB */}
        {tab === "blueprint" && (
          <div className="animate-slide-up">
            {blueprintText ? (
              <article className="prose prose-sm prose-invert max-w-none rounded-2xl bg-white/[0.03] p-6 prose-headings:text-ink prose-p:text-ink/50 prose-p:leading-relaxed prose-a:text-accent prose-strong:text-ink/70 prose-li:text-ink/50 prose-li:leading-relaxed prose-code:text-accent/80 prose-code:bg-white/[0.06] prose-code:rounded prose-code:px-1">
                <ReactMarkdown>{blueprintText}</ReactMarkdown>
              </article>
            ) : state.script ? (
              <div className="flex h-72 flex-col items-center justify-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
                  <span className="text-2xl">⚡</span>
                </div>
                <p className="text-sm text-ink/30">
                  {running ? "Assembling final blueprint..." : "Switch to other tabs to see partial results"}
                </p>
              </div>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center gap-3 animate-float">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
                  <span className="text-2xl">🎬</span>
                </div>
                <p className="text-sm text-ink/30">
                  {running ? "Agents are working on your blueprint..." : "Enter a creative brief to generate a production blueprint"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* SCRIPT TAB */}
        {tab === "script" && (
          <div className="animate-slide-up">
            {state.script ? (
              <article className="prose prose-sm prose-invert max-w-none rounded-2xl bg-white/[0.03] p-6 prose-headings:text-ink prose-p:text-ink/50 prose-p:leading-relaxed prose-strong:text-ink/70">
                <ReactMarkdown>{state.script}</ReactMarkdown>
              </article>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center gap-3 animate-float">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
                  <span className="text-2xl">📝</span>
                </div>
                <p className="text-sm text-ink/30">
                  {running ? "Writing script..." : "No script generated yet"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TIMELINE TAB */}
        {tab === "timeline" && (
          <div className="animate-slide-up">
            {state.timeline && state.timeline.length > 0 ? (
              <div className="space-y-3">
                {state.timeline.map((shot, idx) => (
                  <ShotCard
                    key={idx}
                    shot={typeof shot === "string" ? { description: shot } : shot}
                    index={idx}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center gap-3 animate-float">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
                  <span className="text-2xl">🎬</span>
                </div>
                <p className="text-sm text-ink/30">
                  {running ? "Planning production timeline..." : "No timeline data yet"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ENHANCE TAB */}
        {tab === "enhance" && (
          <div className="animate-slide-up">
            {state.enhancements ? (
              <div className="space-y-4">
                <EnhancementSection title="Hooks" icon="🪝" items={state.enhancements.hooks} />
                <EnhancementSection title="Music & Audio" icon="🎵" items={state.enhancements.music || state.enhancements.audio} />
                <EnhancementSection title="Hashtags" icon="#" items={state.enhancements.hashtags} />
                <EnhancementSection title="Call to Action" icon="📢" items={state.enhancements.cta || state.enhancements.call_to_action} />
                <EnhancementSection title="Transitions" icon="🔄" items={state.enhancements.transitions} />
                <EnhancementSection title="Visual Effects" icon="✨" items={state.enhancements.effects || state.enhancements.visual_effects} />
                {/* Catch-all for any other keys */}
                {Object.entries(state.enhancements)
                  .filter(([k]) => !["hooks", "music", "audio", "hashtags", "cta", "call_to_action", "transitions", "effects", "visual_effects"].includes(k))
                  .map(([key, value]) => (
                    <EnhancementSection key={key} title={key.replace(/_/g, " ")} icon="📌" items={value} />
                  ))
                }
              </div>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center gap-3 animate-float">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
                  <span className="text-2xl">✨</span>
                </div>
                <p className="text-sm text-ink/30">
                  {running ? "Generating enhancements..." : "No enhancement data yet"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* STORY ARC TAB */}
        {tab === "story" && (
          <div className="animate-slide-up">
            {state.story_structure ? (
              <div className="space-y-4">
                {typeof state.story_structure === "string" ? (
                  <article className="prose prose-sm prose-invert max-w-none rounded-2xl bg-white/[0.03] p-6 prose-headings:text-ink prose-p:text-ink/50">
                    <ReactMarkdown>{state.story_structure}</ReactMarkdown>
                  </article>
                ) : (
                  Object.entries(state.story_structure).map(([key, value]) => (
                    <div key={key} className="glass-subtle rounded-xl p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-accent/70 mb-2">
                        {key.replace(/_/g, " ")}
                      </h4>
                      {typeof value === "string" ? (
                        <p className="text-sm text-ink/60 leading-relaxed">{value}</p>
                      ) : (
                        <pre className="text-xs text-ink/50 whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center gap-3 animate-float">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
                  <span className="text-2xl">📐</span>
                </div>
                <p className="text-sm text-ink/30">
                  {running ? "Architecting story structure..." : "No story structure yet"}
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-subtle rounded-2xl p-4 text-center transition-transform duration-300 hover:scale-[1.03]">
                    <p className="text-3xl font-extrabold text-accent">{state.score}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink/30">Quality Score</p>
                  </div>
                  <div className="glass-subtle rounded-2xl p-4 text-center transition-transform duration-300 hover:scale-[1.03]">
                    <p className="text-3xl font-extrabold text-violet-400">{state.iteration_count}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink/30">Refinement Rounds</p>
                  </div>
                </div>

                {/* Feedback */}
                <div className="glass-subtle rounded-2xl p-5">
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink/35">
                    Critic Feedback
                  </h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/50">
                    {state.critique}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center gap-3 animate-float">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
                  <span className="text-2xl">🎯</span>
                </div>
                <p className="text-sm text-ink/30">
                  {running ? "Waiting for quality review..." : "No critique data yet"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
