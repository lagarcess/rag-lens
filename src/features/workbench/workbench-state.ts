import { RAG_LIMITS } from "@/lib/rag-config";
import { listExampleCorpusManifests } from "@/lib/rag/example-corpus-manifest";
import type { EmbeddingMode, RagTraceResponse } from "@/lib/rag/trace";
import type { TraceSummary } from "@/lib/rag/trace-persistence";
import type {
  WorkbenchSessionHeartbeatResponse,
  WorkbenchSessionResponse,
  WorkbenchUploadResponse,
} from "./workbench-api";

export type QueryStatus = "idle" | "loading" | "success" | "error";
export type SessionStatus = "idle" | "creating" | "active" | "deleting" | "error";
export type UploadStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "ready"
  | "error";
export type TraceHistoryStatus = "idle" | "loading" | "ready" | "error";

export interface WorkbenchSource {
  slug: string;
  title: string;
  description: string;
  sourceKind: "example" | "upload";
  sessionId?: string;
  status: "ready" | "coming-soon";
  documentCount: number;
}

export interface WorkbenchSettings {
  topK: number;
  chunkSize: number;
  chunkOverlap: number;
  embeddingMode: EmbeddingMode;
}

export interface WorkbenchState {
  sources: WorkbenchSource[];
  selectedCorpusSlug: string;
  question: string;
  settings: WorkbenchSettings;
  session: {
    status: SessionStatus;
    sessionId: string | null;
    expiresAt: string | null;
    hardExpiresAt: string | null;
    error: string | null;
  };
  uploads: {
    status: UploadStatus;
    documents: WorkbenchUploadedDocument[];
    error: string | null;
  };
  history: {
    status: TraceHistoryStatus;
    traces: TraceSummary[];
    activeQueryId: string | null;
    error: string | null;
  };
  experiment: {
    baseline: RagTraceResponse | null;
    candidate: RagTraceResponse | null;
  };
  query: {
    status: QueryStatus;
    error: string | null;
    result: RagTraceResponse | null;
  };
}

export interface WorkbenchUploadedDocument {
  documentId: string | null;
  sessionId: string | null;
  fileName: string;
  mimeType: string | null;
  byteSize: number | null;
  status: "pending" | "processing" | "ready" | "failed";
  extractedCharacters: number | null;
  error: string | null;
}

export type WorkbenchAction =
  | { type: "sourcesLoaded"; sources: WorkbenchSource[] }
  | { type: "sourceSelected"; corpusSlug: string }
  | { type: "questionChanged"; question: string }
  | { type: "settingChanged"; key: keyof WorkbenchSettings; value: number | string }
  | { type: "sessionCreateStarted" }
  | { type: "sessionCreated"; session: WorkbenchSessionResponse }
  | { type: "sessionFailed"; error: string }
  | {
      type: "sessionHeartbeatSucceeded";
      session: WorkbenchSessionHeartbeatResponse;
    }
  | { type: "sessionHeartbeatFailed"; error: string }
  | { type: "sessionDeleteStarted" }
  | { type: "sessionDeleted" }
  | { type: "sessionDeleteFailed"; error: string }
  | { type: "uploadStarted"; fileName: string }
  | { type: "uploadSucceeded"; document: WorkbenchUploadResponse }
  | { type: "uploadFailed"; error: string }
  | { type: "queryStarted" }
  | { type: "querySucceeded"; result: RagTraceResponse }
  | { type: "queryFailed"; error: string }
  | { type: "traceHistoryStarted" }
  | { type: "traceHistoryLoaded"; traces: TraceSummary[] }
  | { type: "traceHistoryFailed"; error: string }
  | { type: "traceReloadStarted" }
  | { type: "traceReloaded"; result: RagTraceResponse }
  | { type: "experimentBaselinePinned"; result: RagTraceResponse }
  | { type: "experimentComparisonCleared" };

export function createInitialWorkbenchState(): WorkbenchState {
  return {
    sources: listExampleCorpusManifests().map((corpus) => ({
      slug: corpus.slug,
      title: corpus.title,
      description: corpus.description,
      sourceKind: corpus.sourceKind,
      status: corpus.status,
      documentCount: corpus.documentCount,
    })),
    selectedCorpusSlug: "rag-concepts-primer",
    question: "How does RAG improve answer trust?",
    settings: {
      topK: RAG_LIMITS.defaultTopK,
      chunkSize: RAG_LIMITS.defaultChunkSize,
      chunkOverlap: RAG_LIMITS.defaultChunkOverlap,
      embeddingMode: "standard",
    },
    session: {
      status: "idle",
      sessionId: null,
      expiresAt: null,
      hardExpiresAt: null,
      error: null,
    },
    uploads: {
      status: "idle",
      documents: [],
      error: null,
    },
    history: {
      status: "idle",
      traces: [],
      activeQueryId: null,
      error: null,
    },
    experiment: {
      baseline: null,
      candidate: null,
    },
    query: {
      status: "idle",
      error: null,
      result: null,
    },
  };
}

export function workbenchReducer(
  state: WorkbenchState,
  action: WorkbenchAction,
): WorkbenchState {
  switch (action.type) {
    case "sourcesLoaded":
      return mergeLoadedSources(state, action.sources);
    case "sourceSelected":
      return {
        ...state,
        selectedCorpusSlug: action.corpusSlug,
        experiment: createEmptyExperimentState(),
      };
    case "questionChanged":
      return {
        ...state,
        question: action.question,
        experiment: createEmptyExperimentState(),
      };
    case "settingChanged":
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.key]: normalizeSettingValue(action.key, action.value),
        },
      };
    case "sessionCreateStarted":
      return {
        ...state,
        session: {
          ...state.session,
          status: "creating",
          error: null,
        },
      };
    case "sessionCreated":
      return {
        ...state,
        session: {
          status: "active",
          sessionId: action.session.sessionId,
          expiresAt: action.session.expiresAt,
          hardExpiresAt: action.session.hardExpiresAt,
          error: null,
        },
      };
    case "sessionFailed":
      return {
        ...state,
        session: {
          ...state.session,
          status: "error",
          error: action.error,
        },
      };
    case "sessionHeartbeatSucceeded":
      if (action.session.sessionId !== state.session.sessionId) {
        return state;
      }

      return {
        ...state,
        session: {
          status: "active",
          sessionId: action.session.sessionId,
          expiresAt: action.session.expiresAt,
          hardExpiresAt: action.session.hardExpiresAt,
          error: null,
        },
      };
    case "sessionHeartbeatFailed":
      return {
        ...state,
        session: {
          ...state.session,
          error: action.error,
        },
      };
    case "sessionDeleteStarted":
      return {
        ...state,
        session: {
          ...state.session,
          status: "deleting",
          error: null,
        },
      };
    case "sessionDeleted":
      return {
        ...state,
        sources: state.sources.filter(
          (source) => source.slug !== "session-uploads",
        ),
        selectedCorpusSlug: "rag-concepts-primer",
        session: {
          status: "idle",
          sessionId: null,
          expiresAt: null,
          hardExpiresAt: null,
          error: null,
        },
        uploads: {
          status: "idle",
          documents: [],
          error: null,
        },
        history: {
          status: "idle",
          traces: [],
          activeQueryId: null,
          error: null,
        },
        experiment: createEmptyExperimentState(),
      };
    case "sessionDeleteFailed":
      return {
        ...state,
        session: {
          ...state.session,
          status: "error",
          error: action.error,
        },
      };
    case "uploadStarted":
      return {
        ...state,
        uploads: {
          status: "uploading",
          error: null,
          documents: [
            {
              documentId: null,
              sessionId: state.session.sessionId,
              fileName: action.fileName,
              mimeType: null,
              byteSize: null,
              status: "processing",
              extractedCharacters: null,
              error: null,
            },
            ...state.uploads.documents,
          ],
        },
      };
    case "uploadSucceeded":
      return {
        ...state,
        sources: upsertSessionUploadSource({
          sources: state.sources,
          sessionId: action.document.sessionId,
          documentCount:
            state.uploads.documents.filter(
              (document) => document.status === "ready",
            ).length + 1,
        }),
        selectedCorpusSlug: "session-uploads",
        uploads: {
          status: "ready",
          error: null,
          documents: [
            {
              documentId: action.document.documentId,
              sessionId: action.document.sessionId,
              fileName: action.document.fileName,
              mimeType: action.document.mimeType,
              byteSize: action.document.byteSize,
              status: action.document.status,
              extractedCharacters: action.document.extractedCharacters,
              error: null,
            },
            ...state.uploads.documents.filter(
              (document) => document.status !== "processing",
            ),
          ],
        },
      };
    case "uploadFailed":
      return {
        ...state,
        uploads: {
          status: "error",
          error: action.error,
          documents: state.uploads.documents.map((document, index) =>
            index === 0 && document.status === "processing"
              ? { ...document, status: "failed", error: action.error }
              : document,
          ),
        },
      };
    case "queryStarted":
      return {
        ...state,
        query: {
          ...state.query,
          status: "loading",
          error: null,
        },
      };
    case "querySucceeded":
      return {
        ...state,
        history: {
          ...state.history,
          activeQueryId:
            action.result.trace.persistence.mode === "session"
              ? action.result.queryId
              : state.history.activeQueryId,
        },
        experiment: {
          ...state.experiment,
          candidate:
            state.experiment.baseline &&
            state.experiment.baseline.queryId !== action.result.queryId
              ? action.result
              : state.experiment.candidate,
        },
        query: {
          status: "success",
          error: null,
          result: action.result,
        },
      };
    case "queryFailed":
      return {
        ...state,
        query: {
          ...state.query,
          status: "error",
          error: action.error,
        },
      };
    case "traceHistoryStarted":
      return {
        ...state,
        history: {
          ...state.history,
          status: "loading",
          error: null,
        },
      };
    case "traceHistoryLoaded":
      return {
        ...state,
        history: {
          status: "ready",
          traces: action.traces,
          activeQueryId: state.query.result?.queryId ?? state.history.activeQueryId,
          error: null,
        },
      };
    case "traceHistoryFailed":
      return {
        ...state,
        history: {
          ...state.history,
          status: "error",
          error: action.error,
        },
      };
    case "traceReloadStarted":
      return {
        ...state,
        query: {
          ...state.query,
          status: "loading",
          error: null,
        },
      };
    case "traceReloaded":
      return {
        ...state,
        history: {
          ...state.history,
          activeQueryId: action.result.queryId,
        },
        query: {
          status: "success",
          error: null,
          result: action.result,
        },
      };
    case "experimentBaselinePinned":
      return {
        ...state,
        experiment: {
          baseline: action.result,
          candidate: null,
        },
      };
    case "experimentComparisonCleared":
      return {
        ...state,
        experiment: createEmptyExperimentState(),
      };
    default:
      return state;
  }
}

export function selectHeartbeatSessionId(state: WorkbenchState) {
  if (state.session.status !== "active" || !state.session.sessionId) {
    return null;
  }

  const hasLiveUpload = state.uploads.documents.some(
    (document) =>
      document.sessionId === state.session.sessionId &&
      document.status !== "failed",
  );

  return hasLiveUpload ? state.session.sessionId : null;
}

function createEmptyExperimentState() {
  return {
    baseline: null,
    candidate: null,
  };
}

function normalizeSettingValue(
  key: keyof WorkbenchSettings,
  value: number | string,
) {
  if (key === "embeddingMode") {
    return value === "contextualized" ? "contextualized" : "standard";
  }

  return Number(value);
}

function upsertSessionUploadSource(input: {
  sources: WorkbenchSource[];
  sessionId: string;
  documentCount: number;
}) {
  const uploadSource: WorkbenchSource = {
    slug: "session-uploads",
    title: "Uploaded documents",
    description: "Temporary documents indexed for this session",
    sourceKind: "upload",
    sessionId: input.sessionId,
    status: "ready",
    documentCount: input.documentCount,
  };

  const existing = input.sources.find(
    (source) => source.slug === uploadSource.slug,
  );

  if (!existing) {
    return [uploadSource, ...input.sources];
  }

  return input.sources.map((source) =>
    source.slug === uploadSource.slug ? uploadSource : source,
  );
}

function mergeLoadedSources(
  state: WorkbenchState,
  loadedSources: WorkbenchSource[],
): WorkbenchState {
  const uploadSources = state.sources.filter(
    (source) => source.sourceKind === "upload",
  );
  const nextSources = [...loadedSources, ...uploadSources];
  const selectedStillExists = nextSources.some(
    (source) =>
      source.slug === state.selectedCorpusSlug && source.status === "ready",
  );
  const fallbackSource = nextSources.find((source) => source.status === "ready");

  return {
    ...state,
    sources: nextSources,
    selectedCorpusSlug: selectedStillExists
      ? state.selectedCorpusSlug
      : fallbackSource?.slug ?? state.selectedCorpusSlug,
  };
}
