"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  Database,
  FileText,
  GitBranch,
  Loader2,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
} from "lucide-react";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";

import {
  createAnonymousSession,
  deleteAnonymousSession,
  listWorkbenchSources,
  listSessionTraces,
  loadSessionTrace,
  runTraceQuery,
  uploadDocument,
} from "@/features/workbench/workbench-api";
import { buildExperimentComparison } from "@/features/workbench/experiment-compare";
import {
  buildAnswerCitations,
  buildSelectedContextRows,
  buildTraceEvidence,
} from "@/features/workbench/trace-evidence";
import {
  createInitialWorkbenchState,
  workbenchReducer,
} from "@/features/workbench/workbench-state";
import type { RagRetrievalRow, RagTraceResponse } from "@/lib/rag/trace";
import type { TraceSummary } from "@/lib/rag/trace-persistence";

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
  const runButtonLabel = state.experiment.baseline ? "Run variant" : "Run trace";

  useEffect(() => {
    let cancelled = false;

    async function loadSources() {
      try {
        const sources = await listWorkbenchSources();

        if (!cancelled) {
          dispatch({ type: "sourcesLoaded", sources });
        }
      } catch {
        // Keep the bundled manifest fallback if the catalog route is unavailable.
      }
    }

    void loadSources();

    return () => {
      cancelled = true;
    };
  }, []);

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

      const querySessionId = selectedUploadSource
        ? selectedSource.sessionId ?? null
        : null;
      const trace = await runTraceQuery({
        sessionId: querySessionId,
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

      if (querySessionId && trace.trace.persistence.mode === "session") {
        await refreshTraceHistory(querySessionId);
      }
    } catch (error) {
      dispatch({
        type: "queryFailed",
        error:
          error instanceof Error ? error.message : "Unable to run this trace",
      });
    }
  }

  async function refreshTraceHistory(sessionId: string) {
    dispatch({ type: "traceHistoryStarted" });

    try {
      const history = await listSessionTraces(sessionId);
      dispatch({ type: "traceHistoryLoaded", traces: history.traces });
    } catch (error) {
      dispatch({
        type: "traceHistoryFailed",
        error:
          error instanceof Error
            ? error.message
            : "Unable to refresh trace history",
      });
    }
  }

  async function handleTraceSelected(queryId: string) {
    if (!state.session.sessionId || isLoading) {
      return;
    }

    dispatch({ type: "traceReloadStarted" });

    try {
      const trace = await loadSessionTrace({
        sessionId: state.session.sessionId,
        queryId,
      });
      dispatch({ type: "traceReloaded", result: trace });
    } catch (error) {
      dispatch({
        type: "queryFailed",
        error:
          error instanceof Error ? error.message : "Unable to load this trace",
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
                    {runButtonLabel}
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </div>
            {state.query.error ? (
              <p
                className="mt-3 text-sm text-[var(--danger)]"
                role="alert"
              >
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
        <ExperimentPanel
          experiment={state.experiment}
          isLoading={isLoading}
          result={result}
          selectedUploadSource={selectedUploadSource}
          onClear={() => dispatch({ type: "experimentComparisonCleared" })}
          onPinBaseline={(trace) =>
            dispatch({ type: "experimentBaselinePinned", result: trace })
          }
        />
      </section>

      <TraceInspector
        activeQueryId={state.history.activeQueryId}
        history={state.history}
        isLoading={isLoading}
        onTraceSelected={handleTraceSelected}
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

function formatSignedNumber(value: number) {
  return value > 0 ? `+${formatNumber(value)}` : formatNumber(value);
}

function formatSignedDecimal(value: number) {
  const formatted = value.toFixed(3);

  return value > 0 ? `+${formatted}` : formatted;
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
  const numericSettings = [
    ["topK", "top_k", 1, 12, 1],
    ["chunkSize", "chunk_size", 160, 2000, 40],
    ["chunkOverlap", "overlap", 0, state.settings.chunkSize - 1, 40],
  ] as const;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Database className="size-4 text-[var(--accent-strong)]" />
        Experiment settings
      </div>
      <p className="mb-3 text-xs leading-5 text-[var(--muted)]">
        Change one setting, rerun, then compare the trace.
      </p>
      <div className="space-y-3 font-mono text-xs text-[var(--muted)]">
        {numericSettings.map(([key, label, min, max, step]) => {
          const locked = uploadProfileLocked && key !== "topK";
          const value =
            key === "chunkSize" && locked
              ? 800
              : key === "chunkOverlap" && locked
                ? 120
                : state.settings[key as keyof typeof state.settings];
          const inputId = `setting-input-${key}`;
          const rangeId = `setting-range-${key}`;

          return (
            <div className="block" key={String(key)}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label htmlFor={rangeId} id={`setting-${key}`}>
                  {label}
                </label>
                <input
                  aria-label={`${label} value`}
                  className="h-7 w-16 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 text-right font-mono text-xs text-[var(--foreground)] outline-none ring-[var(--accent)] transition focus:ring-2 disabled:opacity-50"
                  disabled={locked}
                  id={inputId}
                  max={Number(max)}
                  min={Number(min)}
                  onChange={(event) => {
                    if (!event.target.value) {
                      return;
                    }

                    dispatch({
                      type: "settingChanged",
                      key,
                      value: event.target.value,
                    });
                  }}
                  step={Number(step)}
                  type="number"
                  value={Number(value)}
                />
              </div>
              <input
                aria-labelledby={`setting-${key}`}
                className="w-full accent-[var(--accent-strong)] disabled:opacity-50"
                disabled={locked}
                max={Number(max)}
                min={Number(min)}
                onChange={(event) =>
                  dispatch({
                    type: "settingChanged",
                    key,
                    value: event.target.value,
                  })
                }
                step={Number(step)}
                type="range"
                id={rangeId}
                value={Number(value)}
              />
            </div>
          );
        })}
      </div>
      <fieldset className="mt-4">
        <legend className="mb-2 font-mono text-xs text-[var(--muted)]">
          embedding
        </legend>
        <div className="grid grid-cols-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-1">
          {[
            ["standard", "Standard"],
            ["contextualized", "Contextual"],
          ].map(([value, label]) => {
            const active = state.settings.embeddingMode === value;

            return (
              <button
                aria-pressed={active}
                className={[
                  "rounded-md px-2 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                  active
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]",
                ].join(" ")}
                disabled={uploadProfileLocked}
                key={value}
                onClick={() =>
                  dispatch({
                    type: "settingChanged",
                    key: "embeddingMode",
                    value,
                  })
                }
                type="button"
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>
      {uploadProfileLocked ? (
        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
          Uploaded documents use their indexed chunk and embedding profile for
          this slice. Adjust top_k to compare retrieval breadth.
        </p>
      ) : null}
    </div>
  );
}

function ExperimentPanel({
  experiment,
  isLoading,
  result,
  selectedUploadSource,
  onClear,
  onPinBaseline,
}: {
  experiment: WorkbenchState["experiment"];
  isLoading: boolean;
  result: RagTraceResponse | null;
  selectedUploadSource: boolean;
  onClear: () => void;
  onPinBaseline: (trace: RagTraceResponse) => void;
}) {
  const comparison =
    experiment.baseline && experiment.candidate
      ? buildExperimentComparison({
          baseline: experiment.baseline,
          candidate: experiment.candidate,
        })
      : null;

  return (
    <section
      aria-labelledby="experiment-heading"
      className="border-t border-[var(--border)] p-5"
    >
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="size-4 text-[var(--accent-strong)]" />
              <h2 id="experiment-heading">Trace comparison</h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Pin the current trace as A, change the settings, then run a
              variant to compare retrieval and prompt behavior.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-3 text-sm font-semibold text-[var(--background)] disabled:cursor-not-allowed disabled:opacity-55"
              disabled={!result || isLoading}
              onClick={() => result && onPinBaseline(result)}
              type="button"
            >
              <Check className="size-4" />
              {experiment.baseline ? "Pin current as A" : "Pin baseline"}
            </button>
            {experiment.baseline || experiment.candidate ? (
              <button
                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--accent-strong)] hover:text-[var(--foreground)]"
                onClick={onClear}
                type="button"
              >
                <RotateCcw className="size-4" />
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <div
          aria-live="polite"
          className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4"
        >
          {!experiment.baseline ? (
            <p className="text-sm leading-6 text-[var(--muted)]">
              Run a trace, then pin it as the baseline before testing a variant.
            </p>
          ) : comparison ? (
            <TraceComparison comparison={comparison} />
          ) : (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <TraceSnapshot
                label="A baseline"
                trace={experiment.baseline}
              />
              <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">
                Baseline pinned. Change one setting and run a variant to fill B.
              </p>
            </div>
          )}
        </div>

        {selectedUploadSource ? (
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
            Upload experiments compare query-time retrieval settings. Chunking
            and embedding profile changes require re-indexing, which is
            deferred to a later slice.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function TraceComparison({
  comparison,
}: {
  comparison: ReturnType<typeof buildExperimentComparison>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <TraceMetricCard
          label="A baseline"
          promptChars={comparison.retrieval.baselinePromptChars}
          retrievedCount={comparison.retrieval.baselineRetrievedCount}
          topScore={comparison.retrieval.baselineTopScore}
        />
        <TraceMetricCard
          label="B variant"
          promptChars={comparison.retrieval.candidatePromptChars}
          promptCharsDelta={comparison.retrieval.promptCharsDelta}
          retrievedCount={comparison.retrieval.candidateRetrievedCount}
          retrievedDelta={comparison.retrieval.retrievedDelta}
          topScoreDelta={comparison.retrieval.topScoreDelta}
          topScore={comparison.retrieval.candidateTopScore}
        />
      </div>

      <div>
        <h3 className="mb-2 font-mono text-[11px] uppercase text-[var(--muted)]">
          Settings
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {comparison.settings.map((setting) => (
            <div
              className={[
                "rounded-md border p-3 font-mono text-[11px]",
                setting.changed
                  ? "border-[var(--accent-strong)] bg-[var(--badge-bg)] text-[var(--badge-fg)]"
                  : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted)]",
              ].join(" ")}
              key={setting.key}
            >
              <div className="mb-1 text-[var(--foreground)]">
                {setting.label}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>A {setting.baseline}</span>
                <span>B {setting.candidate}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <ChunkIdList
          label="Shared chunks"
          ids={comparison.retrieval.sharedChunkIds}
        />
        <ChunkIdList
          label="Only in A"
          ids={comparison.retrieval.baselineOnlyChunkIds}
        />
        <ChunkIdList
          label="Only in B"
          ids={comparison.retrieval.candidateOnlyChunkIds}
        />
      </div>

      <div>
        <h3 className="mb-2 font-mono text-[11px] uppercase text-[var(--muted)]">
          Failure-mode notes
        </h3>
        {comparison.notes.length > 0 ? (
          <ul className="space-y-2">
            {comparison.notes.map((note) => (
              <li
                className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-sm leading-6 text-[var(--muted)]"
                key={note}
              >
                {note}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-sm leading-6 text-[var(--muted)]">
            No obvious retrieval warning in the variant.
          </p>
        )}
      </div>
    </div>
  );
}

function TraceSnapshot({
  label,
  trace,
}: {
  label: string;
  trace: RagTraceResponse;
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
      <div className="text-sm font-semibold">{label}</div>
      <dl className="mt-2 grid grid-cols-3 gap-3 font-mono text-[11px] text-[var(--muted)]">
        <div>
          <dt>top_k</dt>
          <dd className="text-[var(--foreground)]">{trace.trace.settings.topK}</dd>
        </div>
        <div>
          <dt>chunks</dt>
          <dd className="text-[var(--foreground)]">
            {trace.trace.retrieval.rows.length}
          </dd>
        </div>
        <div>
          <dt>prompt</dt>
          <dd className="text-[var(--foreground)]">
            {formatNumber(trace.trace.prompt.rendered.length)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function TraceMetricCard({
  label,
  promptChars,
  promptCharsDelta,
  retrievedCount,
  retrievedDelta,
  topScore,
  topScoreDelta,
}: {
  label: string;
  promptChars: number;
  promptCharsDelta?: number;
  retrievedCount: number;
  retrievedDelta?: number;
  topScore: number;
  topScoreDelta?: number;
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
      <div className="text-sm font-semibold">{label}</div>
      <dl className="mt-3 grid grid-cols-3 gap-3 font-mono text-[11px] text-[var(--muted)]">
        <div>
          <dt>top score</dt>
          <dd className="text-[var(--foreground)]">
            {topScore.toFixed(3)}
            {topScoreDelta === undefined ? null : (
              <>
                {" "}
                <span className="text-[var(--muted)]">
                  (delta {formatSignedDecimal(topScoreDelta)})
                </span>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>retrieved</dt>
          <dd className="text-[var(--foreground)]">
            {formatNumber(retrievedCount)}
            {retrievedDelta === undefined ? null : (
              <>
                {" "}
                <span className="text-[var(--muted)]">
                  (delta {formatSignedNumber(retrievedDelta)})
                </span>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>prompt</dt>
          <dd className="text-[var(--foreground)]">
            {formatNumber(promptChars)}
            {promptCharsDelta === undefined ? null : (
              <>
                {" "}
                <span className="text-[var(--muted)]">
                  (delta {formatSignedNumber(promptCharsDelta)})
                </span>
              </>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function ChunkIdList({ label, ids }: { label: string; ids: string[] }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
      <h3 className="font-mono text-[11px] uppercase text-[var(--muted)]">
        {label}
      </h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ids.length > 0 ? (
          ids.map((id) => (
            <span
              className="max-w-full truncate rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 font-mono text-[10px] text-[var(--muted)]"
              key={id}
            >
              {id}
            </span>
          ))
        ) : (
          <span className="text-sm text-[var(--muted)]">None</span>
        )}
      </div>
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
        <AnswerCitations result={result} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["chunks", formatNumber(result.trace.chunking.totalChunks)],
          ["retrieved", formatNumber(result.trace.retrieval.rows.length)],
          ["latency_ms", formatNumber(result.trace.timingsMs.total)],
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

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["retrieval_ms", result.trace.timingsMs.retrieval],
          ["generation_ms", result.trace.timingsMs.generation],
          [
            "context_chunks",
            result.trace.prompt.contextChunkIds.length,
          ],
        ].map(([label, value]) => (
          <div
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3"
            key={label}
          >
            <div className="font-mono text-[11px] text-[var(--muted)]">
              {label}
            </div>
            <div className="mt-1 text-lg font-semibold">
              {formatNumber(Number(value))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnswerCitations({
  result,
}: {
  result: NonNullable<
    ReturnType<typeof createInitialWorkbenchState>["query"]["result"]
  >;
}) {
  const citations = buildAnswerCitations(result);

  if (citations.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-[var(--border)] pt-4">
      <h3 className="mb-2 font-mono text-[11px] uppercase text-[var(--muted)]">
        Citations
      </h3>
      <div className="flex flex-wrap gap-2">
        {citations.map((citation) => (
          <span
            className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 font-mono text-[11px] text-[var(--muted)]"
            key={`${citation.label}-${citation.detail}`}
          >
            <span className="font-semibold text-[var(--foreground)]">
              {citation.label}
            </span>{" "}
            {citation.detail}
          </span>
        ))}
      </div>
    </div>
  );
}

function TraceInspector({
  activeQueryId,
  history,
  isLoading,
  onTraceSelected,
  prompt,
  rows,
  result,
}: {
  activeQueryId: string | null;
  history: WorkbenchState["history"];
  isLoading: boolean;
  onTraceSelected: (queryId: string) => void;
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
  const evidence = useMemo(
    () => (result ? buildTraceEvidence(result) : null),
    [result],
  );
  const selectedContextRows = useMemo(
    () => (result ? buildSelectedContextRows(result) : []),
    [result],
  );

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

      <RecentTracesList
        activeQueryId={activeQueryId}
        history={history}
        onTraceSelected={onTraceSelected}
      />

      <TraceEvidenceStack
        evidence={evidence}
        selectedContextRows={selectedContextRows}
      />

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

function TraceEvidenceStack({
  evidence,
  selectedContextRows,
}: {
  evidence: ReturnType<typeof buildTraceEvidence> | null;
  selectedContextRows: ReturnType<typeof buildSelectedContextRows>;
}) {
  if (!evidence) {
    return (
      <section className="mb-4 rounded-lg border border-[var(--trace-border)] bg-[var(--trace-card)] p-3">
        <h3 className="font-mono text-[11px] text-[var(--accent-cyan)]">
          evidence stack
        </h3>
        <p className="mt-2 text-xs leading-5 text-[var(--trace-muted)]">
          Run a trace to inspect extraction, chunks, embeddings, retrieval,
          prompt assembly, and model metadata.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="trace-evidence-heading"
      className="mb-4 space-y-3 rounded-lg border border-[var(--trace-border)] bg-[var(--trace-card)] p-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          className="font-mono text-[11px] text-[var(--accent-cyan)]"
          id="trace-evidence-heading"
        >
          evidence stack
        </h3>
        <span className="font-mono text-[10px] text-[var(--trace-muted)]">
          {evidence.stages.length} stages
        </span>
      </div>

      <div className="space-y-2">
        {evidence.stages.map((stage) => (
          <div
            className="rounded-md border border-[var(--trace-border)] bg-[var(--trace-code-bg)] p-2"
            key={stage.label}
          >
            <div className="flex items-center justify-between gap-3 font-mono text-[11px]">
              <span className="text-[var(--trace-muted)]">{stage.label}</span>
              <span className="text-[var(--trace-foreground)]">
                {stage.value}
              </span>
            </div>
            <p className="mt-1 break-words font-mono text-[10px] leading-4 text-[var(--trace-muted)]">
              {stage.detail}
            </p>
          </div>
        ))}
      </div>

      <TraceKeyValueList title="timings" rows={evidence.timingRows} />
      <TraceKeyValueList title="models" rows={evidence.modelRows} />

      <div>
        <div className="mb-2 font-mono text-[11px] text-[var(--accent-cyan)]">
          selected context
        </div>
        {selectedContextRows.length === 0 ? (
          <p className="rounded-md border border-[var(--trace-border)] bg-[var(--trace-code-bg)] p-2 text-xs leading-5 text-[var(--trace-muted)]">
            No retrieved chunks reached the prompt context.
          </p>
        ) : (
          <ol className="space-y-2">
            {selectedContextRows.map((row) => (
              <li
                className="rounded-md border border-[var(--trace-border)] bg-[var(--trace-code-bg)] p-2 font-mono text-[11px]"
                key={row.chunkId}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-[var(--trace-foreground)]">
                    {row.fileName}
                  </span>
                  <span className="shrink-0 text-[var(--accent)]">
                    {row.rank === null ? "not retrieved" : `rank ${row.rank}`}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-[var(--trace-muted)]">
                  <span className="truncate">{row.chunkId}</span>
                  <span className="shrink-0">
                    {row.similarity === null
                      ? "no score"
                      : row.similarity.toFixed(3)}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {evidence.warnings.length > 0 ? (
        <div>
          <div className="mb-2 font-mono text-[11px] text-[var(--accent-cyan)]">
            warnings
          </div>
          <ul className="space-y-1">
            {evidence.warnings.map((warning) => (
              <li
                className="rounded-md border border-[var(--warning)]/40 bg-[var(--trace-code-bg)] p-2 text-xs leading-5 text-[var(--trace-muted)]"
                key={warning}
              >
                {warning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function TraceKeyValueList({
  rows,
  title,
}: {
  rows: Array<[string, string]>;
  title: string;
}) {
  return (
    <div>
      <div className="mb-2 font-mono text-[11px] text-[var(--accent-cyan)]">
        {title}
      </div>
      <dl className="space-y-1">
        {rows.map(([label, value]) => (
          <div
            className="flex items-start justify-between gap-3 rounded-md border border-[var(--trace-border)] bg-[var(--trace-code-bg)] p-2 font-mono text-[11px]"
            key={`${title}-${label}`}
          >
            <dt className="shrink-0 text-[var(--trace-muted)]">{label}</dt>
            <dd className="min-w-0 break-words text-right text-[var(--trace-foreground)]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function RecentTracesList({
  activeQueryId,
  history,
  onTraceSelected,
}: {
  activeQueryId: string | null;
  history: WorkbenchState["history"];
  onTraceSelected: (queryId: string) => void;
}) {
  if (history.status === "idle" && history.traces.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="recent-traces-heading"
      className="mb-4 rounded-lg border border-[var(--trace-border)] bg-[var(--trace-card)] p-3"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3
          className="font-mono text-[11px] text-[var(--accent-cyan)]"
          id="recent-traces-heading"
        >
          recent traces
        </h3>
        <span
          aria-live="polite"
          className="font-mono text-[10px] text-[var(--trace-muted)]"
        >
          {history.status === "loading"
            ? "syncing"
            : `${history.traces.length} saved`}
        </span>
      </div>

      {history.error ? (
        <p className="text-xs leading-5 text-[var(--danger)]" role="alert">
          {history.error}
        </p>
      ) : null}

      {history.traces.length === 0 ? (
        <p className="text-xs leading-5 text-[var(--trace-muted)]">
          Saved session traces will appear after the first upload query.
        </p>
      ) : (
        <ol className="space-y-2">
          {history.traces.map((trace) => {
            const active = trace.queryId === activeQueryId;

            return (
              <li key={trace.queryId}>
                <button
                  aria-current={active ? "true" : undefined}
                  className={[
                    "w-full rounded-md border p-2 text-left transition focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]",
                    active
                      ? "border-[var(--accent)] bg-[var(--trace-code-bg)]"
                      : "border-[var(--trace-border)] bg-transparent hover:border-[var(--accent-cyan)]",
                  ].join(" ")}
                  onClick={() => onTraceSelected(trace.queryId)}
                  type="button"
                >
                  <span className="line-clamp-2 text-xs font-medium leading-5 text-[var(--trace-foreground)]">
                    {trace.question}
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-[var(--trace-muted)]">
                    <span>
                      {trace.retrievedCount} chunks ·{" "}
                      {formatTraceTime(trace.createdAt)}
                    </span>
                    <span>{formatSourceKind(trace)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function TraceRow({ row }: { row: RagRetrievalRow }) {
  return (
    <details className="rounded-lg border border-[var(--trace-border)] bg-[var(--trace-card)] p-3">
      <summary className="cursor-pointer">
        <div className="mb-2 flex items-center justify-between font-mono text-[11px]">
          <span className="text-[var(--accent)]">rank {row.rank}</span>
          <div className="flex items-center gap-2">
            <span
              className={[
                "rounded-full border px-2 py-0.5 text-[10px]",
                row.selected
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-[var(--trace-border)] text-[var(--trace-muted)]",
              ].join(" ")}
            >
              {row.selected ? "selected" : "ignored"}
            </span>
            <span className="text-[var(--trace-muted)]">
              similarity {row.similarity.toFixed(3)}
            </span>
          </div>
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
          <div>
            <dt>distance</dt>
            <dd>{row.distance === undefined ? "n/a" : row.distance.toFixed(3)}</dd>
          </div>
          <div>
            <dt>embedding</dt>
            <dd>{row.embeddingModel ?? row.embeddingMode ?? "n/a"}</dd>
          </div>
        </dl>
        <p className="whitespace-pre-wrap font-mono text-xs leading-5 text-[var(--trace-foreground)]">
          {row.content}
        </p>
      </div>
    </details>
  );
}

function formatTraceTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSourceKind(trace: TraceSummary) {
  return trace.sourceKind === "upload" ? "upload" : "example";
}
