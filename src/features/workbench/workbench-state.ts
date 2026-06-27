import { RAG_LIMITS } from "@/lib/rag-config";
import type { EmbeddingMode, RagTraceResponse } from "@/lib/rag/trace";

export type QueryStatus = "idle" | "loading" | "success" | "error";

export interface WorkbenchSource {
  slug: string;
  title: string;
  description: string;
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
  query: {
    status: QueryStatus;
    error: string | null;
    result: RagTraceResponse | null;
  };
}

export type WorkbenchAction =
  | { type: "sourceSelected"; corpusSlug: string }
  | { type: "questionChanged"; question: string }
  | { type: "settingChanged"; key: keyof WorkbenchSettings; value: number | string }
  | { type: "queryStarted" }
  | { type: "querySucceeded"; result: RagTraceResponse }
  | { type: "queryFailed"; error: string };

export function createInitialWorkbenchState(): WorkbenchState {
  return {
    sources: [
      {
        slug: "rag-concepts-primer",
        title: "RAG Concepts Primer",
        description: "Small first-party explainer corpus",
        status: "ready",
        documentCount: 1,
      },
      {
        slug: "scifact-mini",
        title: "SciFact Mini",
        description: "Evidence retrieval example",
        status: "coming-soon",
        documentCount: 0,
      },
      {
        slug: "hotpotqa-mini",
        title: "HotpotQA Mini",
        description: "Multi-hop retrieval example",
        status: "coming-soon",
        documentCount: 0,
      },
    ],
    selectedCorpusSlug: "rag-concepts-primer",
    question: "How does RAG improve answer trust?",
    settings: {
      topK: RAG_LIMITS.defaultTopK,
      chunkSize: RAG_LIMITS.defaultChunkSize,
      chunkOverlap: RAG_LIMITS.defaultChunkOverlap,
      embeddingMode: "standard",
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
    case "sourceSelected":
      return {
        ...state,
        selectedCorpusSlug: action.corpusSlug,
      };
    case "questionChanged":
      return {
        ...state,
        question: action.question,
      };
    case "settingChanged":
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.key]: normalizeSettingValue(action.key, action.value),
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
    default:
      return state;
  }
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
