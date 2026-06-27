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

export async function runExampleTrace(
  request: RagQueryRequest,
  options: {
    answerProvider?: AnswerProvider;
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
  const retrieval = retrieveLexical({
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
          provider: "none",
          model: "local-lexical",
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
