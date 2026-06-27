import { describe, expect, test } from "bun:test";

import {
  buildAnswerCitations,
  buildSelectedContextRows,
  buildTraceChunkRows,
  buildTraceEvidence,
} from "./trace-evidence";
import type { RagTraceResponse } from "@/lib/rag/trace";

describe("buildTraceEvidence", () => {
  test("summarizes the trace stages that explain a RAG answer", () => {
    const evidence = buildTraceEvidence(createTrace());

    expect(evidence.summary).toBe(
      "2 evidence matches found; 1 chunk sent to the model prompt.",
    );
    expect(evidence.stages).toEqual([
      {
        label: "Read documents",
        value: "1 doc",
        detail: "guide.md · 1,280 chars",
      },
      {
        label: "Split into chunks",
        value: "4 chunks",
        detail: "800 characters each · 120 overlap",
      },
      {
        label: "Compared meaning",
        value: "perplexity",
        detail: "query: pplx-query · docs: pplx-doc",
      },
      {
        label: "Found evidence",
        value: "2 matches",
        detail: "2 rows · 1 sent to prompt · supabase-pgvector-cosine",
      },
      {
        label: "Built prompt",
        value: "53 chars",
        detail: "1 context chunk",
      },
      {
        label: "Generated answer",
        value: "openrouter",
        detail: "deepseek/deepseek-v4-flash · stop",
      },
    ]);
    expect(evidence.timingRows).toEqual([
      ["full run", "42 ms"],
      ["finding evidence", "17 ms"],
      ["writing answer", "25 ms"],
    ]);
    expect(evidence.modelRows).toEqual([
      ["embedding model", "perplexity / pplx-base"],
      ["question vectors", "pplx-query"],
      ["document vectors", "pplx-doc"],
      ["chat model", "openrouter / deepseek/deepseek-v4-flash"],
      ["finish reason", "stop"],
      ["token use", "118 in · 24 out · 142 total"],
      ["stored as", "session / supabase-trace-history"],
    ]);
    expect(evidence.warnings).toEqual(["Low similarity"]);
  });
});

describe("buildSelectedContextRows", () => {
  test("maps prompt context ids to retrieved rows in prompt order", () => {
    const rows = buildSelectedContextRows(createTrace());

    expect(rows).toEqual([
      {
        chunkId: "chunk-b",
        rank: 2,
        fileName: "guide.md",
        similarity: 0.42,
      },
    ]);
  });
});

describe("buildTraceChunkRows", () => {
  test("returns every chunk with retrieval metadata when present", () => {
    const rows = buildTraceChunkRows(createTrace());

    expect(rows).toEqual([
      {
        chunkId: "chunk-a",
        fileName: "guide.md",
        chunkIndex: 0,
        charStart: 0,
        charEnd: 799,
        preview: "A chunk",
        rank: 1,
        similarity: 0.81,
        selected: false,
        retrieved: true,
      },
      {
        chunkId: "chunk-b",
        fileName: "guide.md",
        chunkIndex: 1,
        charStart: 680,
        charEnd: 1279,
        preview: "B chunk",
        rank: 2,
        similarity: 0.42,
        selected: true,
        retrieved: true,
      },
      {
        chunkId: "chunk-c",
        fileName: "guide.md",
        chunkIndex: 2,
        charStart: 1160,
        charEnd: 1919,
        preview:
          "An unretrieved chunk with extra whitespace and enough content to require a compact preview for...",
        rank: null,
        similarity: null,
        selected: false,
        retrieved: false,
      },
      {
        chunkId: "chunk-d",
        fileName: "appendix.md",
        chunkIndex: 0,
        charStart: 0,
        charEnd: 420,
        preview: "Appendix chunk",
        rank: null,
        similarity: null,
        selected: false,
        retrieved: false,
      },
    ]);
  });
});

describe("buildAnswerCitations", () => {
  test("formats citations with rank, file name, chunk id, and similarity", () => {
    const citations = buildAnswerCitations(createTrace());

    expect(citations).toEqual([
      {
        label: "[1]",
        detail: "guide.md · chunk-a · match score 0.810",
      },
    ]);
  });
});

function createTrace(): RagTraceResponse {
  return {
    queryId: "query-1",
    answer: "Answer",
    citations: [
      {
        rank: 1,
        chunkId: "chunk-a",
        fileName: "guide.md",
        similarity: 0.81,
      },
    ],
    trace: {
      settings: {
        topK: 2,
        chunkSize: 800,
        chunkOverlap: 120,
        embeddingMode: "standard",
      },
      corpus: {
        slug: "session-uploads",
        title: "Uploaded documents",
        sourceKind: "upload",
        documentCount: 1,
      },
      extraction: {
        documents: [
          {
            documentId: "doc-1",
            fileName: "guide.md",
            characterCount: 1280,
          },
        ],
      },
      chunking: {
        totalChunks: 4,
        chunks: [
          {
            chunkId: "chunk-a",
            documentId: "doc-1",
            fileName: "guide.md",
            chunkIndex: 0,
            charStart: 0,
            charEnd: 799,
            content: "A chunk",
          },
          {
            chunkId: "chunk-b",
            documentId: "doc-1",
            fileName: "guide.md",
            chunkIndex: 1,
            charStart: 680,
            charEnd: 1279,
            content: "B chunk",
          },
          {
            chunkId: "chunk-c",
            documentId: "doc-1",
            fileName: "guide.md",
            chunkIndex: 2,
            charStart: 1160,
            charEnd: 1919,
            content:
              "An unretrieved chunk with\n\nextra whitespace and enough content to require a compact preview for trace row rendering in the inspector.",
          },
          {
            chunkId: "chunk-d",
            documentId: "doc-2",
            fileName: "appendix.md",
            chunkIndex: 0,
            charStart: 0,
            charEnd: 420,
            content: "Appendix chunk",
          },
        ],
      },
      retrieval: {
        method: "supabase-pgvector-cosine",
        rows: [
          {
            chunkId: "chunk-a",
            documentId: "doc-1",
            fileName: "guide.md",
            chunkIndex: 0,
            charStart: 0,
            charEnd: 799,
            content: "A chunk",
            rank: 1,
            similarity: 0.81,
            distance: 0.19,
            selected: false,
            retrievalMode: "vector",
            matchedTerms: [],
            embeddingModel: "pplx-doc",
            embeddingMode: "standard",
          },
          {
            chunkId: "chunk-b",
            documentId: "doc-1",
            fileName: "guide.md",
            chunkIndex: 1,
            charStart: 680,
            charEnd: 1279,
            content: "B chunk",
            rank: 2,
            similarity: 0.42,
            distance: 0.58,
            selected: true,
            retrievalMode: "vector",
            matchedTerms: [],
            embeddingModel: "pplx-doc",
            embeddingMode: "standard",
          },
        ],
      },
      prompt: {
        rendered: "Use context chunk-b to answer this user question now.",
        contextChunkIds: ["chunk-b"],
      },
      models: {
        embedding: {
          provider: "perplexity",
          model: "pplx-base",
          queryModel: "pplx-query",
          documentModel: "pplx-doc",
        },
        answer: {
          provider: "openrouter",
          model: "deepseek/deepseek-v4-flash",
          finishReason: "stop",
          usage: {
            promptTokens: 118,
            completionTokens: 24,
            totalTokens: 142,
          },
        },
      },
      timingsMs: {
        total: 42,
        retrieval: 17,
        generation: 25,
      },
      persistence: {
        mode: "session",
        store: "supabase-trace-history",
      },
      warnings: ["Low similarity"],
    },
  };
}
