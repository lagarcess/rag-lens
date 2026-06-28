import {
  Braces,
  CheckCircle2,
  Database,
  FileText,
  Gauge,
  LockKeyhole,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LandingWarmupCta } from "@/features/landing/warmup-cta";

const sourceRows = [
  {
    title: "RAG Concepts Primer",
    detail: "Example corpus",
    active: true,
  },
  {
    title: "Claim Check Clinic",
    detail: "Evidence ranking",
    active: false,
  },
  {
    title: "Upload docs",
    detail: "Temporary session",
    active: false,
  },
];

const traceRows = [
  {
    label: "Chunk 03",
    source: "rag-primer.md",
    score: "0.82",
    selected: true,
  },
  {
    label: "Chunk 07",
    source: "claim-check.md",
    score: "0.74",
    selected: true,
  },
  {
    label: "Chunk 11",
    source: "systems-brief.md",
    score: "0.41",
    selected: false,
  },
];

const proofItems = [
  {
    icon: FileText,
    title: "Bring a tiny corpus",
    text: "Start with first-party examples or upload a PDF, text, or markdown file for an anonymous demo session.",
  },
  {
    icon: Search,
    title: "Inspect retrieval",
    text: "See extracted text, chunks, similarity scores, selected context, prompt assembly, and citations.",
  },
  {
    icon: SlidersHorizontal,
    title: "Compare settings",
    text: "Rerun with top-k and chunking controls to see how evidence, prompt length, and grounding change.",
  },
];

const safetyRows = [
  {
    icon: ShieldCheck,
    title: "Temporary anonymous uploads",
    text: "Uploads are capped at three files and 10 MB per session, expire with the demo session, and can be deleted immediately.",
  },
  {
    icon: LockKeyhole,
    title: "Secrets stay server-side",
    text: "Supabase service-role, Perplexity, and OpenRouter keys are never exposed to browser code.",
  },
  {
    icon: Gauge,
    title: "Public-demo rate limits",
    text: "Session, upload, and query routes are throttled before expensive work to keep the hosted sandbox usable.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col overflow-x-clip bg-[var(--background)] text-[var(--foreground)]">
      <SiteHeader />

      <section className="border-b border-[var(--border)]">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-6 py-8 lg:grid-cols-[0.86fr_1.14fr] lg:py-10">
          <div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.03] sm:text-5xl lg:text-6xl">
              Inspect a real RAG app built on your own docs.
            </h1>
            <p className="mt-5 max-w-2xl font-mono text-sm leading-7 text-[var(--muted)] sm:text-base">
              Retrieve, Inspect, Understand{" "}
              <span className="text-[var(--accent-strong)]">RAG.</span>
            </p>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--muted)]">
              RAG Lens is a practical debugger for retrieval-augmented
              generation: choose an example corpus or upload a temporary
              document, ask a question, and inspect the trace behind the answer.
            </p>
            <div className="mt-8">
              <LandingWarmupCta />
            </div>
          </div>

          <WorkbenchPreview />
        </div>
      </section>

      <section className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[0.6fr_1.4fr]">
          <div>
            <h2 className="text-2xl font-semibold">What the trace shows</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              The public entry point sends visitors straight into the workbench
              instead of a tutorial. The useful proof is the retrieval trace.
            </p>
            <div className="mt-6 space-y-3 text-sm text-[var(--muted)]">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--accent-strong)]" />
                <span>First-party examples work without uploads.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--accent-strong)]" />
                <span>Anonymous files expire with the session.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--accent-strong)]" />
                <span>Provider calls stay behind route handlers.</span>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {proofItems.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
                  key={item.title}
                >
                  <Icon className="size-5 text-[var(--accent-strong)]" />
                  <h3 className="mt-5 text-base font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    {item.text}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-4 lg:grid-cols-3">
            {safetyRows.map((row) => {
              const Icon = row.icon;

              return (
                <article
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
                  key={row.title}
                >
                  <Icon className="size-5 text-[var(--accent-strong)]" />
                  <h2 className="mt-5 text-base font-semibold">{row.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    {row.text}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function WorkbenchPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_70px_rgba(21,25,23,0.10)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold">RAG Lens workbench</p>
          <p className="font-mono text-xs text-[var(--muted)]">
            query_9a4f · standard embeddings
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--muted)]">
          <span className="size-2 rounded-full bg-[var(--accent-strong)]" />
          Ready
        </div>
      </div>

      <div className="grid lg:grid-cols-[0.78fr_1.18fr_1.04fr]">
        <aside className="border-b border-[var(--border)] bg-[var(--surface-muted)] p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--muted)]">
            <Database className="size-3.5" />
            Sources
          </div>
          <div className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {sourceRows.map((source) => (
              <div
                className="flex items-start justify-between gap-3 p-3"
                key={source.title}
              >
                <div>
                  <p className="text-sm font-semibold">{source.title}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {source.detail}
                  </p>
                </div>
                {source.active ? (
                  <span className="rounded-md bg-[var(--badge-bg)] px-2 py-1 text-xs font-semibold text-[var(--badge-fg)]">
                    Active
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <p className="text-sm font-semibold">Anonymous upload</p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              3 files · 10 MB · PDF, TXT, MD
            </p>
          </div>
        </aside>

        <section className="p-4">
          <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
            <p className="text-xs font-semibold text-[var(--muted)]">
              Question
            </p>
            <p className="mt-1 text-sm">
              How does retrieval improve answer trust?
            </p>
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--muted)]">
              <Braces className="size-3.5" />
              Answer with citations
            </div>
            <p className="mt-3 text-sm leading-7">
              RAG improves trust by showing which source chunks grounded the
              response, then exposing the prompt and retrieval scores that shaped
              the answer.
            </p>
            <div className="mt-5 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              <div className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="text-[var(--muted)]">Citation 1</span>
                <span className="font-mono text-xs text-[var(--accent-strong)]">
                  rag-primer.md · 0.82
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="text-[var(--muted)]">Citation 2</span>
                <span className="font-mono text-xs text-[var(--accent-cyan)]">
                  claim-check.md · 0.74
                </span>
              </div>
            </div>
          </div>
        </section>

        <aside className="bg-[var(--trace-surface)] p-4 text-[var(--trace-foreground)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--trace-accent)]">
                Trace inspector
              </p>
              <p className="mt-1 font-mono text-xs text-[var(--trace-muted)]">
                top_k=5 · chunk=800 · overlap=120
              </p>
            </div>
            <span className="rounded-md border border-[var(--trace-border)] px-2 py-1 font-mono text-xs text-[var(--trace-muted)]">
              1.2s
            </span>
          </div>

          <div className="mt-5 divide-y divide-[var(--trace-border)] border-y border-[var(--trace-border)]">
            {traceRows.map((row) => (
              <div className="py-3" key={row.label}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs text-[var(--trace-foreground)]">
                    {row.label}
                  </p>
                  <p className="font-mono text-xs text-[var(--trace-accent)]">
                    {row.score}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--trace-muted)]">
                  <span>{row.source}</span>
                  <span>{row.selected ? "selected" : "below threshold"}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-[var(--trace-border)] bg-[var(--trace-card)] p-3">
            <p className="text-xs font-semibold text-[var(--trace-accent)]">
              Prompt assembly
            </p>
            <p className="mt-2 font-mono text-xs leading-5 text-[var(--trace-muted)]">
              system + selected chunks + question → grounded response
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
