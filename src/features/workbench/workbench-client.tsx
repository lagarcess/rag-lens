"use client";

import {
  Activity,
  ArrowRight,
  Database,
  FileText,
  GitBranch,
  Loader2,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
} from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useReducer, useState } from "react";

import {
  createAnonymousSession,
  deleteAnonymousSession,
  runTraceQuery,
  uploadDocument,
} from "@/features/workbench/workbench-api";
import {
  createInitialWorkbenchState,
  workbenchReducer,
} from "@/features/workbench/workbench-state";
import type { RagRetrievalRow } from "@/lib/rag/trace";

export function WorkbenchClient() {
  const [state, dispatch] = useReducer(
    workbenchReducer,
    undefined,
    createInitialWorkbenchState,
  );
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const selectedSource = state.sources.find(
    (source) => source.slug === state.selectedCorpusSlug,
  );
  const selectedUploadSource = selectedSource?.sourceKind === "upload";
  const result = state.query.result;
  const isLoading = state.query.status === "loading";
  const isUploading =
    state.uploads.status === "uploading" ||
    state.uploads.status === "processing" ||
    state.session.status === "creating";
  const isDeletingSession = state.session.status === "deleting";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading || !state.question.trim()) {
      return;
    }

    dispatch({ type: "queryStarted" });

    try {
      if (selectedUploadSource && !selectedSource.sessionId) {
        throw new Error("Upload a document before querying uploaded sources.");
      }

      const trace = await runTraceQuery({
        sessionId: selectedUploadSource ? selectedSource.sessionId ?? null : null,
        corpusSlug: selectedUploadSource
          ? "session-uploads"
          : state.selectedCorpusSlug,
        question: state.question,
        topK: state.settings.topK,
        chunkSize: selectedUploadSource ? 800 : state.settings.chunkSize,
        chunkOverlap: selectedUploadSource ? 120 : state.settings.chunkOverlap,
        embeddingMode: selectedUploadSource
          ? "standard"
          : state.settings.embeddingMode,
      });

      dispatch({ type: "querySucceeded", result: trace });
    } catch (error) {
      dispatch({
        type: "queryFailed",
        error:
          error instanceof Error ? error.message : "Unable to run this trace",
      });
    }
  }

  async function handleUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!uploadFile || isUploading) {
      return;
    }

    dispatch({ type: "uploadStarted", fileName: uploadFile.name });

    try {
      let sessionId = state.session.sessionId;

      if (!sessionId) {
        dispatch({ type: "sessionCreateStarted" });
        const session = await createAnonymousSession();
        dispatch({ type: "sessionCreated", session });
        sessionId = session.sessionId;
      }

      const document = await uploadDocument({
        sessionId,
        file: uploadFile,
      });

      dispatch({ type: "uploadSucceeded", document });
      setUploadFile(null);
    } catch (error) {
      dispatch({
        type: "uploadFailed",
        error:
          error instanceof Error ? error.message : "Unable to upload document",
      });
    }
  }

  function handleUploadFileChange(event: ChangeEvent<HTMLInputElement>) {
    setUploadFile(event.target.files?.[0] ?? null);
  }

  async function handleDeleteSession() {
    if (!state.session.sessionId || isDeletingSession) {
      return;
    }

    dispatch({ type: "sessionDeleteStarted" });

    try {
      await deleteAnonymousSession(state.session.sessionId);
      dispatch({ type: "sessionDeleted" });
      setUploadFile(null);
    } catch (error) {
      dispatch({
        type: "sessionDeleteFailed",
        error:
          error instanceof Error ? error.message : "Unable to delete session",
      });
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-7xl min-w-0 flex-1 gap-6 px-6 py-8 lg:grid-cols-[280px_minmax(0,1fr)_380px]">
      <aside className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Knowledge sources</h2>
          <span className="rounded-full bg-[var(--badge-bg)] px-2 py-1 font-mono text-[11px] text-[var(--badge-fg)]">
            sources
          </span>
        </div>
        <div className="space-y-2">
          {state.sources.map((source) => {
            const selected = source.slug === state.selectedCorpusSlug;
            const ready = source.status === "ready";

            return (
              <button
                className={[
                  "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition",
                  selected
                    ? "border-[var(--accent-strong)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)] bg-[var(--surface-elevated)]",
                  ready
                    ? "hover:border-[var(--accent-strong)]"
                    : "cursor-not-allowed opacity-60",
                ].join(" ")}
                disabled={!ready}
                aria-pressed={selected}
                key={source.slug}
                onClick={() =>
                  dispatch({
                    type: "sourceSelected",
                    corpusSlug: source.slug,
                  })
                }
                type="button"
              >
                <FileText className="mt-0.5 size-4 text-[var(--accent-strong)]" />
                <span>
                  <span className="block text-sm font-medium">
                    {source.title}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--muted)]">
                    {ready ? formatSourceCount(source) : "coming soon"}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                    {source.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <form
          className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-4"
          onSubmit={handleUploadSubmit}
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4 text-[var(--accent-strong)]" />
            Public upload policy
          </div>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Do not upload secrets, private files, or personal data. Anonymous
            uploads are session-scoped, size-limited, and deleted within 24
            hours.
          </p>
          <label
            className="mt-4 block text-xs font-medium text-[var(--muted)]"
            htmlFor="document-upload"
          >
            PDF, text, or markdown
          </label>
          <input
            accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown,text/x-markdown"
            className="mt-2 block w-full cursor-pointer rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] text-xs text-[var(--muted)] file:mr-3 file:border-0 file:bg-[var(--surface)] file:px-3 file:py-2 file:text-xs file:font-medium file:text-[var(--foreground)]"
            id="document-upload"
            onChange={handleUploadFileChange}
            type="file"
          />
          <button
            className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-3 text-sm font-semibold text-[var(--background)] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={!uploadFile || isUploading}
            type="submit"
          >
            {isUploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Uploading
              </>
            ) : (
              <>
                <UploadCloud className="size-4" />
                Upload document
              </>
            )}
          </button>
          {state.session.expiresAt ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="font-mono text-[11px] text-[var(--muted)]">
                session expires {formatDateTime(state.session.expiresAt)}
              </p>
              <button
                className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDeletingSession}
                onClick={handleDeleteSession}
                type="button"
              >
                {isDeletingSession ? "Deleting" : "Delete now"}
              </button>
            </div>
          ) : null}
          {state.session.error ? (
            <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
              {state.session.error}
            </p>
          ) : null}
          {state.uploads.error ? (
            <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
              {state.uploads.error}
            </p>
          ) : null}
          {state.uploads.documents.length > 0 ? (
            <div className="mt-4 space-y-2" role="status" aria-live="polite">
              {state.uploads.documents.map((document) => (
                <div
                  className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] p-3"
                  key={`${document.documentId ?? "pending"}-${document.fileName}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium">
                      {document.fileName}
                    </span>
                    <span className="rounded-full bg-[var(--badge-bg)] px-2 py-0.5 font-mono text-[10px] text-[var(--badge-fg)]">
                      {document.status === "ready" ? "indexed" : document.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    {document.extractedCharacters
                      ? `${formatNumber(document.extractedCharacters)} characters indexed.`
                      : "Preparing upload for extraction."}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </form>
      </aside>

      <section className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] p-5">
          <div className="mb-4 flex items-center gap-3 text-sm">
            <span className="font-semibold">Workbench</span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 font-mono text-[11px] text-[var(--muted)]">
              live trace
            </span>
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Ask a question and inspect the retrieval trace.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Selected source: {selectedSource?.title ?? "No source selected"}.
          </p>
        </div>

        <div className="grid gap-4 p-5 2xl:grid-cols-[1fr_240px]">
          <form
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4"
            onSubmit={handleSubmit}
          >
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="question"
            >
              Ask the selected corpus
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="min-h-11 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-sm outline-none ring-[var(--accent)] transition focus:ring-2"
                id="question"
                onChange={(event) =>
                  dispatch({
                    type: "questionChanged",
                    question: event.target.value,
                  })
                }
                value={state.question}
              />
              <button
                className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-[var(--accent-button-fg)] disabled:cursor-not-allowed disabled:opacity-60 sm:py-0"
                disabled={isLoading || !state.question.trim()}
                type="submit"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Running
                  </>
                ) : (
                  <>
                    Run trace
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </div>
            {state.query.error ? (
              <p className="mt-3 text-sm text-[var(--danger)]">
                {state.query.error}
              </p>
            ) : null}
          </form>

          <RetrievalControls
            selectedSource={selectedSource}
            state={state}
            dispatch={dispatch}
          />
        </div>

        <AnswerPanel isLoading={isLoading} result={result} />
      </section>

      <TraceInspector
        isLoading={isLoading}
        prompt={result?.trace.prompt.rendered}
        rows={result?.trace.retrieval.rows ?? []}
        result={result}
      />
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatSourceCount(source: { documentCount: number; sourceKind: string }) {
  const label = source.documentCount === 1 ? "doc" : "docs";
  const scope = source.sourceKind === "upload" ? "session" : "indexed";

  return `${source.documentCount} ${label} ${scope}`;
}

type WorkbenchState = ReturnType<typeof createInitialWorkbenchState>;
type WorkbenchDispatch = React.Dispatch<
  Parameters<typeof workbenchReducer>[1]
>;

function RetrievalControls({
  selectedSource,
  state,
  dispatch,
}: {
  selectedSource: WorkbenchState["sources"][number] | undefined;
  state: WorkbenchState;
  dispatch: WorkbenchDispatch;
}) {
  const uploadProfileLocked = selectedSource?.sourceKind === "upload";

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Database className="size-4 text-[var(--accent-strong)]" />
        Retrieval config
      </div>
      <div className="space-y-3 font-mono text-xs text-[var(--muted)]">
        {[
          ["topK", "top_k", 1, 12],
          ["chunkSize", "chunk_size", 160, 2000],
          ["chunkOverlap", "overlap", 0, state.settings.chunkSize - 1],
        ].map(([key, label, min, max]) => {
          const locked = uploadProfileLocked && key !== "topK";
          const value =
            key === "chunkSize" && locked
              ? 800
              : key === "chunkOverlap" && locked
                ? 120
                : state.settings[key as keyof typeof state.settings];

          return (
            <label className="block" key={String(key)}>
              <span className="mb-1 flex justify-between">
                <span>{label}</span>
                <span>{value}</span>
              </span>
              <input
                className="w-full accent-[var(--accent-strong)] disabled:opacity-50"
                disabled={locked}
                max={Number(max)}
                min={Number(min)}
                onChange={(event) =>
                  dispatch({
                    type: "settingChanged",
                    key: key as keyof typeof state.settings,
                    value: event.target.value,
                  })
                }
                step={key === "topK" ? 1 : 40}
                type="range"
                value={Number(value)}
              />
            </label>
          );
        })}
      </div>
      {uploadProfileLocked ? (
        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
          Uploaded documents use the default indexed chunk profile for this
          slice.
        </p>
      ) : null}
    </div>
  );
}

function AnswerPanel({
  isLoading,
  result,
}: {
  isLoading: boolean;
  result: ReturnType<typeof createInitialWorkbenchState>["query"]["result"];
}) {
  if (isLoading && !result) {
    return (
      <div className="border-t border-[var(--border)] p-5">
        <div className="h-28 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="border-t border-[var(--border)] p-5">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="size-4 text-[var(--accent-strong)]" />
            Ready
          </div>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Run the default question to generate the first trace.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t border-[var(--border)] p-5">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-5">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold">Answer</h2>
          <span className="font-mono text-[11px] text-[var(--muted)]">
            {result.trace.models.answer.provider} /{" "}
            {result.trace.models.answer.model}
          </span>
        </div>
        <p className="text-sm leading-7 text-[var(--foreground)]">
          {result.answer}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["chunks", result.trace.chunking.totalChunks],
          ["retrieved", result.trace.retrieval.rows.length],
          ["latency_ms", result.trace.timingsMs.total],
        ].map(([label, value]) => (
          <div
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3"
            key={label}
          >
            <div className="font-mono text-[11px] text-[var(--muted)]">
              {label}
            </div>
            <div className="mt-1 text-lg font-semibold">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TraceInspector({
  isLoading,
  prompt,
  rows,
  result,
}: {
  isLoading: boolean;
  prompt?: string;
  rows: RagRetrievalRow[];
  result: ReturnType<typeof createInitialWorkbenchState>["query"]["result"];
}) {
  const modelMeta = useMemo(() => {
    if (!result) {
      return "waiting for trace";
    }

    return `${result.trace.models.answer.provider} / ${result.trace.models.answer.model}`;
  }, [result]);

  return (
    <aside className="min-w-0 rounded-xl border border-[var(--trace-border)] bg-[var(--trace-surface)] p-5 text-[var(--trace-foreground)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Trace inspector</h2>
          <p className="font-mono text-[11px] text-[var(--trace-muted)]">
            {isLoading ? "running query" : modelMeta}
          </p>
        </div>
        <Activity className="size-4 text-[var(--accent)]" />
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-[var(--trace-border)] bg-[var(--trace-card)] p-3 text-sm leading-6 text-[var(--trace-muted)]">
            Retrieved chunks will appear here.
          </div>
        ) : (
          rows.map((row) => <TraceRow key={row.chunkId} row={row} />)
        )}
      </div>

      <div className="mt-4 rounded-lg border border-[var(--trace-border)] bg-[var(--trace-code-bg)] p-3">
        <div className="mb-2 flex items-center gap-2 font-mono text-[11px] text-[var(--accent-cyan)]">
          <GitBranch className="size-3.5" />
          prompt assembly
        </div>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-mono text-xs leading-5 text-[var(--trace-foreground)]">
          {prompt ?? "Run a trace to inspect the prompt."}
        </pre>
      </div>
    </aside>
  );
}

function TraceRow({ row }: { row: RagRetrievalRow }) {
  return (
    <details className="rounded-lg border border-[var(--trace-border)] bg-[var(--trace-card)] p-3">
      <summary className="cursor-pointer list-none">
        <div className="mb-2 flex items-center justify-between font-mono text-[11px]">
          <span className="text-[var(--accent)]">rank {row.rank}</span>
          <span className="text-[var(--trace-muted)]">
            {row.similarity.toFixed(3)}
          </span>
        </div>
        <div className="font-mono text-xs text-[var(--trace-foreground)]">
          {row.fileName} · chunk {row.chunkIndex} · {row.retrievalMode}
        </div>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--trace-muted)]">
          {row.content}
        </p>
      </summary>
      <div className="mt-3 border-t border-[var(--trace-border)] pt-3">
        <dl className="mb-3 grid grid-cols-2 gap-2 font-mono text-[11px] text-[var(--trace-muted)]">
          <div>
            <dt>offset</dt>
            <dd>
              {row.charStart}-{row.charEnd}
            </dd>
          </div>
          <div>
            <dt>terms</dt>
            <dd>{row.matchedTerms.join(", ") || "none"}</dd>
          </div>
        </dl>
        <p className="whitespace-pre-wrap font-mono text-xs leading-5 text-[var(--trace-foreground)]">
          {row.content}
        </p>
      </div>
    </details>
  );
}
