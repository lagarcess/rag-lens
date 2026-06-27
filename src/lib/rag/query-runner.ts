import { performance } from "node:perf_hooks";

import { RAG_LIMITS } from "@/lib/rag-config";

import { chunkText } from "./chunk";
import { loadExampleCorpus } from "./example-corpora";
import { assemblePrompt, buildLocalAnswer } from "./prompt";
import { retrieveLexical } from "./retrieve";
import type {
  EmbeddingMode,
  RagCitation,
  RagChunk,
  RagQueryRequest,
  RetrievalMethod,
  RagRetrievalRow,
  RagTraceResponse,
} from "./trace";

export interface AnswerProviderInput {
  question: string;
  prompt: string;
  citationCount: number;
}

export interface AnswerProviderResult {
  answer: string;
  provider: "local" | "openrouter";
  model: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export type AnswerProvider = (
  input: AnswerProviderInput,
) => Promise<AnswerProviderResult>;

export type RetrievalProvider = (input: {
  question: string;
  chunks: RagChunk[];
  topK: number;
  corpusSlug: string;
  sessionId?: string;
}) => Promise<{
  method: RetrievalMethod;
  rows: RagRetrievalRow[];
  queryEmbeddingModel?: string;
  documentEmbeddingModel?: string;
}>;

export interface VectorTraceSource {
  slug: string;
  title: string;
  sourceKind: "example" | "upload";
  documentCount: number;
  totalChunks: number;
  documents: Array<{
    documentId: string;
    fileName: string;
    characterCount: number;
  }>;
}

export async function runExampleTrace(
  request: RagQueryRequest,
  options: {
    answerProvider?: AnswerProvider;
    retrievalProvider?: RetrievalProvider;
  } = {},
): Promise<RagTraceResponse> {
  const totalStartedAt = performance.now();
  const corpus = await loadExampleCorpus(request.corpusSlug);

  const settings = normalizeSettings(request);
  const chunks: RagChunk[] = corpus.documents.flatMap((document) =>
    chunkText(document, {
      chunkSize: settings.chunkSize,
      chunkOverlap: settings.chunkOverlap,
    }),
  );

  const retrievalStartedAt = performance.now();
  const retrieval = options.retrievalProvider
    ? await options.retrievalProvider({
        question: request.question,
        chunks,
        topK: settings.topK,
        corpusSlug: request.corpusSlug,
      })
    : retrieveLexical({
        question: request.question,
        chunks,
        topK: settings.topK,
      });
  const retrievalMs = elapsed(retrievalStartedAt);

  const generationStartedAt = performance.now();
  const prompt = assemblePrompt({
    question: request.question,
    retrievalRows: retrieval.rows,
  });
  const localAnswer = buildLocalAnswer(retrieval.rows);
  const answerResult = options.answerProvider
    ? await options.answerProvider({
        question: request.question,
        prompt: prompt.rendered,
        citationCount: retrieval.rows.length,
      })
    : {
        answer: localAnswer,
        provider: "local" as const,
        model: "extractive-summary",
      };
  const generationMs = elapsed(generationStartedAt);

  const citations: RagCitation[] = retrieval.rows.map((row) => ({
    rank: row.rank,
    chunkId: row.chunkId,
    fileName: row.fileName,
    similarity: row.similarity,
  }));

  return {
    queryId: crypto.randomUUID(),
    answer: answerResult.answer,
    citations,
    trace: {
      settings,
      corpus: {
        slug: corpus.slug,
        title: corpus.title,
        sourceKind: "example",
        documentCount: corpus.documents.length,
      },
      extraction: {
        documents: corpus.documents.map((document) => ({
          documentId: document.documentId,
          fileName: document.fileName,
          characterCount: document.content.length,
        })),
      },
      chunking: {
        totalChunks: chunks.length,
        chunks,
      },
      retrieval,
      prompt,
      models: {
        embedding: {
          ...buildEmbeddingModelMetadata(retrieval),
        },
        answer: {
          provider: answerResult.provider,
          model: answerResult.model,
          finishReason: answerResult.finishReason,
          usage: answerResult.usage,
        },
      },
      timingsMs: {
        total: elapsed(totalStartedAt),
        retrieval: retrievalMs,
        generation: generationMs,
      },
      persistence: {
        mode: "ephemeral",
        store: "local-example-runner",
      },
      warnings:
        retrieval.rows.length === 0 || retrieval.rows[0].similarity === 0
          ? ["weak-retrieval"]
          : [],
    },
  };
}

export async function runVectorTrace(
  request: RagQueryRequest,
  options: {
    source: VectorTraceSource;
    retrievalProvider: RetrievalProvider;
    answerProvider?: AnswerProvider;
  },
): Promise<RagTraceResponse> {
  const totalStartedAt = performance.now();
  const settings = normalizeSettings(request);

  const retrievalStartedAt = performance.now();
  const retrieval = await options.retrievalProvider({
    question: request.question,
    chunks: [],
    topK: settings.topK,
    corpusSlug: request.corpusSlug,
    sessionId: request.sessionId ?? undefined,
  });
  const retrievalMs = elapsed(retrievalStartedAt);

  const generationStartedAt = performance.now();
  const prompt = assemblePrompt({
    question: request.question,
    retrievalRows: retrieval.rows,
  });
  const localAnswer = buildLocalAnswer(retrieval.rows);
  const answerResult = options.answerProvider
    ? await options.answerProvider({
        question: request.question,
        prompt: prompt.rendered,
        citationCount: retrieval.rows.length,
      })
    : {
        answer: localAnswer,
        provider: "local" as const,
        model: "extractive-summary",
      };
  const generationMs = elapsed(generationStartedAt);

  const citations: RagCitation[] = retrieval.rows.map((row) => ({
    rank: row.rank,
    chunkId: row.chunkId,
    fileName: row.fileName,
    similarity: row.similarity,
  }));

  return {
    queryId: crypto.randomUUID(),
    answer: answerResult.answer,
    citations,
    trace: {
      settings,
      corpus: {
        slug: options.source.slug,
        title: options.source.title,
        sourceKind: options.source.sourceKind,
        documentCount: options.source.documentCount,
      },
      extraction: {
        documents: options.source.documents,
      },
      chunking: {
        totalChunks: options.source.totalChunks,
        chunks: retrieval.rows,
      },
      retrieval,
      prompt,
      models: {
        embedding: {
          ...buildEmbeddingModelMetadata(retrieval),
        },
        answer: {
          provider: answerResult.provider,
          model: answerResult.model,
          finishReason: answerResult.finishReason,
          usage: answerResult.usage,
        },
      },
      timingsMs: {
        total: elapsed(totalStartedAt),
        retrieval: retrievalMs,
        generation: generationMs,
      },
      persistence: {
        mode: "ephemeral",
        store: "supabase-session-vectors",
      },
      warnings:
        retrieval.rows.length === 0 || retrieval.rows[0].similarity === 0
          ? ["weak-retrieval"]
          : [],
    },
  };
}

function buildEmbeddingModelMetadata(retrieval: {
  method: RetrievalMethod;
  rows: RagRetrievalRow[];
  queryEmbeddingModel?: string;
  documentEmbeddingModel?: string;
}) {
  if (retrieval.method !== "supabase-pgvector-cosine") {
    return {
      provider: "none" as const,
      model: "local-lexical",
    };
  }

  const documentModel =
    retrieval.documentEmbeddingModel ?? retrieval.rows[0]?.embeddingModel;
  const queryModel = retrieval.queryEmbeddingModel;

  return {
    provider: "perplexity" as const,
    model: queryModel ?? documentModel ?? "perplexity-embedding",
    queryModel,
    documentModel,
  };
}

function normalizeSettings(request: RagQueryRequest) {
  const topK = clampInteger(request.topK, 1, RAG_LIMITS.maxTopK);
  const chunkSize = clampInteger(request.chunkSize, 160, 2_000);
  const chunkOverlap = clampInteger(
    request.chunkOverlap,
    0,
    Math.max(0, chunkSize - 1),
  );

  return {
    topK,
    chunkSize,
    chunkOverlap,
    embeddingMode: normalizeEmbeddingMode(request.embeddingMode),
  };
}

function normalizeEmbeddingMode(mode: EmbeddingMode): EmbeddingMode {
  return mode === "contextualized" ? "contextualized" : "standard";
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.floor(value)));
}

function elapsed(startedAt: number): number {
  return Number((performance.now() - startedAt).toFixed(2));
}
