import {
  Activity,
  ArrowRight,
  Database,
  FileText,
  GitBranch,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const traceSteps = [
  { label: "Extract", detail: "PDF/text parsed into normalized source text" },
  { label: "Chunk", detail: "Recursive chunks with overlap and offsets" },
  { label: "Embed", detail: "Perplexity contextual vectors, cosine-ready" },
  { label: "Retrieve", detail: "Supabase pgvector ranks top passages" },
  { label: "Answer", detail: "Prompt, citations, and model output captured" },
];

const sampleCorpora = [
  "RAG concepts primer",
  "SciFact retrieval mini",
  "HotpotQA multi-hop mini",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface-dark)] text-[var(--accent)]">
              <Search className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">rag-lens</div>
              <div className="font-mono text-[11px] text-[var(--muted)]">
                practical RAG debugger
              </div>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-[var(--muted)] md:flex">
            <a className="hover:text-[var(--foreground)]" href="/docs">
              Docs
            </a>
            <a className="hover:text-[var(--foreground)]" href="/api/health">
              Health
            </a>
            <a
              className="rounded-md bg-[var(--surface-dark)] px-3 py-2 font-medium text-white"
              href="https://github.com/"
            >
              GitHub soon
            </a>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[280px_minmax(0,1fr)_380px]">
        <aside className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Knowledge sources</h2>
            <span className="rounded-full bg-emerald-50 px-2 py-1 font-mono text-[11px] text-emerald-700">
              demo
            </span>
          </div>
          <div className="space-y-2">
            {sampleCorpora.map((corpus, index) => (
              <button
                className="flex w-full items-start gap-3 rounded-lg border border-[var(--border)] bg-white p-3 text-left transition hover:border-[var(--accent-strong)]"
                key={corpus}
              >
                <FileText className="mt-0.5 size-4 text-[var(--accent-strong)]" />
                <span>
                  <span className="block text-sm font-medium">{corpus}</span>
                  <span className="font-mono text-[11px] text-[var(--muted)]">
                    {index + 3} docs indexed
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="size-4 text-[var(--accent-strong)]" />
              Public upload policy
            </div>
            <p className="text-sm leading-6 text-[var(--muted)]">
              Anonymous uploads will be session-scoped, size-limited, and deleted
              by a Render cleanup job.
            </p>
          </div>
        </aside>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] p-5">
            <div className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              <Sparkles className="size-4" />
              V1 workbench preview
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
              Upload a document, ask a question, and see why the answer happened.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
              rag-lens turns retrieval into an inspectable trace: chunks,
              vectors, ranked passages, prompt assembly, response, and citations.
            </p>
          </div>

          <div className="grid gap-4 p-5 2xl:grid-cols-[1fr_240px]">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <label
                className="mb-2 block text-sm font-medium"
                htmlFor="question-preview"
              >
                Ask the selected corpus
              </label>
              <div className="flex gap-2">
                <input
                  className="min-h-11 flex-1 rounded-md border border-[var(--border)] bg-white px-3 text-sm outline-none ring-[var(--accent)] transition focus:ring-2"
                  defaultValue="How does RAG improve answer trust?"
                  id="question-preview"
                />
                <button className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[#07110d]">
                  Run trace
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Database className="size-4 text-[var(--accent-strong)]" />
                Retrieval config
              </div>
              <dl className="space-y-2 font-mono text-xs text-[var(--muted)]">
                <div className="flex justify-between">
                  <dt>top_k</dt>
                  <dd>5</dd>
                </div>
                <div className="flex justify-between">
                  <dt>chunk_size</dt>
                  <dd>800</dd>
                </div>
                <div className="flex justify-between">
                  <dt>embedding</dt>
                  <dd>context-0.6b</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="grid gap-3 border-t border-[var(--border)] p-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {traceSteps.map((step, index) => (
              <div
                className="rounded-lg border border-[var(--border)] bg-white p-3"
                key={step.label}
              >
                <div className="mb-2 font-mono text-[11px] text-[var(--muted)]">
                  0{index + 1}
                </div>
                <div className="text-sm font-semibold">{step.label}</div>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  {step.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-dark)] p-5 text-white">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Trace inspector</h2>
              <p className="font-mono text-[11px] text-[var(--muted-dark)]">
                selected query preview
              </p>
            </div>
            <Activity className="size-4 text-[var(--accent)]" />
          </div>

          <div className="space-y-3">
            {[
              ["chunk_014", "0.842", "Source attribution improves trust..."],
              ["chunk_003", "0.811", "RAG redirects the model to retrieve..."],
              ["chunk_021", "0.776", "The augmented prompt includes..."],
            ].map(([id, score, text], index) => (
              <div
                className="rounded-lg border border-[var(--border-dark)] bg-[var(--surface-dark-2)] p-3"
                key={id}
              >
                <div className="mb-2 flex items-center justify-between font-mono text-[11px]">
                  <span className="text-[var(--accent)]">rank {index + 1}</span>
                  <span className="text-[var(--muted-dark)]">{score}</span>
                </div>
                <div className="font-mono text-xs text-white/90">{id}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-dark)]">
                  {text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-[var(--border-dark)] bg-black/20 p-3">
            <div className="mb-2 flex items-center gap-2 font-mono text-[11px] text-[var(--accent-cyan)]">
              <GitBranch className="size-3.5" />
              prompt assembly
            </div>
            <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-white/80">
{`system: answer only from context
context: top 5 ranked chunks
user: How does RAG improve trust?`}
            </pre>
          </div>
        </aside>
      </section>
    </main>
  );
}
