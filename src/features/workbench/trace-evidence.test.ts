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
      "The app found 2 pieces of evidence and gave 1 piece of evidence to the answer writer.",
    );
    expect(evidence.retrievalVerdict).toEqual({
      label: "strong evidence",
      tone: "strong",
      detail:
        "The top match is high and the retriever found multiple chunks to compare.",
      topSimilarity: 0.81,
      topSimilarityPercent: 81,
      retrievedCount: 2,
    });
    expect(evidence.stages).toEqual([
      {
        label: "Read documents",
        meaning: "Document reading",
        value: "1 doc",
        detail: "guide.md · 1,280 chars",
        whatThisMeans:
          "The app read the available files and counted how much searchable text they contain.",
      },
      {
        label: "Split into chunks",
        meaning: "Chunking",
        value: "4 chunks",
        detail: "800 characters each · 120 overlap",
        whatThisMeans:
          "The document text was split into smaller passages so each passage can be checked against the question.",
      },
      {
        label: "Compared meaning",
        meaning: "Semantic comparison",
        value: "perplexity",
        detail: "query: pplx-query · docs: pplx-doc",
        whatThisMeans:
          "The question and document chunks were turned into comparable meaning signals before search.",
      },
      {
        label: "Found evidence",
        meaning: "Retrieval",
        value: "2 matches",
        detail: "2 rows · 1 sent to prompt · supabase-pgvector-cosine",
        whatThisMeans:
          "The app ranked chunks by how closely they matched the question and chose which evidence to send forward.",
      },
      {
        label: "Built prompt",
        meaning: "Prompt assembly",
        value: "53 chars",
        detail: "1 context chunk",
        whatThisMeans:
          "Only the selected evidence was placed beside the question for the answer writer.",
      },
      {
        label: "Generated answer",
        meaning: "Answer generation",
        value: "openrouter",
        detail: "deepseek/deepseek-v4-flash · stop",
        whatThisMeans:
          "The answer writer used the provided evidence and question to produce the final response.",
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
    expect(evidence.warnings).toEqual([
      "Some retrieved evidence scored low, so check whether the answer is fully supported by the documents.",
    ]);
  });

  test("classifies retrieval grounding with simple score and row-count thresholds", () => {
    expect(buildTraceEvidence(createTraceWithScores([0.8, 0.7])).retrievalVerdict)
      .toMatchObject({
        label: "strong evidence",
        tone: "strong",
        topSimilarityPercent: 80,
        retrievedCount: 2,
      });
    expect(buildTraceEvidence(createTraceWithScores([0.74, 0.6])).retrievalVerdict)
      .toMatchObject({
        label: "usable evidence",
        tone: "usable",
        topSimilarityPercent: 74,
        retrievedCount: 2,
      });
    expect(buildTraceEvidence(createTraceWithScores([0.9])).retrievalVerdict)
      .toMatchObject({
        label: "usable evidence",
        tone: "usable",
        topSimilarityPercent: 90,
        retrievedCount: 1,
      });

    const weakEvidence = buildTraceEvidence(createTraceWithScores([0.44, 0.2]));

    expect(weakEvidence.retrievalVerdict).toMatchObject({
      label: "weak evidence",
      tone: "weak",
      topSimilarityPercent: 44,
      retrievedCount: 2,
    });
    expect(weakEvidence.warnings).toContain(
      "The best retrieved evidence is weak, so the answer may need a better question or better source text.",
    );

    expect(buildTraceEvidence(createTraceWithScores([])).retrievalVerdict)
      .toEqual({
        label: "no evidence",
        tone: "none",
        detail: "No chunks were retrieved for this question.",
        topSimilarity: null,
        topSimilarityPercent: null,
        retrievedCount: 0,
      });
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
        scorePercent: 81,
        scoreBarValue: 81,
        scoreLabel: "strong",
        scoreDescription: "81% similarity to the question.",
        stateLabel: "found, not sent",
        stateDescription:
          "This chunk matched the question, but it was not included in the prompt context.",
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
        scorePercent: 42,
        scoreBarValue: 42,
        scoreLabel: "weak",
        scoreDescription: "42% similarity to the question.",
        stateLabel: "sent to prompt",
        stateDescription:
          "This chunk was included as evidence for the answer writer.",
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
        scorePercent: null,
        scoreBarValue: 0,
        scoreLabel: "no score",
        scoreDescription:
          "No retrieval score because this chunk was not returned for the question.",
        stateLabel: "not retrieved",
        stateDescription:
          "This chunk was indexed, but it was not one of the matches for this question.",
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
        scorePercent: null,
        scoreBarValue: 0,
        scoreLabel: "no score",
        scoreDescription:
          "No retrieval score because this chunk was not returned for the question.",
        stateLabel: "not retrieved",
        stateDescription:
          "This chunk was indexed, but it was not one of the matches for this question.",
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

function createTraceWithScores(scores: number[]): RagTraceResponse {
  const trace = createTrace();
  const chunkRows = trace.trace.chunking.chunks.slice(0, scores.length);

  trace.trace.retrieval.rows = chunkRows.map((chunk, index) => ({
    ...chunk,
    rank: index + 1,
    similarity: scores[index],
    distance: 1 - scores[index],
    selected: index === 0,
    retrievalMode: "vector",
    matchedTerms: [],
    embeddingModel: "pplx-doc",
    embeddingMode: "standard",
  }));
  trace.trace.prompt.contextChunkIds =
    scores.length === 0 ? [] : [chunkRows[0].chunkId];
  trace.trace.warnings = [];

  return trace;
}
