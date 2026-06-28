import { describe, expect, test } from "bun:test";

import { buildExperimentComparison } from "./experiment-compare";
import type { RagTraceResponse } from "@/lib/rag/trace";

describe("buildExperimentComparison", () => {
  test("summarizes changed settings, retrieval overlap, score deltas, and prompt growth", () => {
    const comparison = buildExperimentComparison({
      baseline: createTrace({
        queryId: "baseline-query",
        chunkSize: 800,
        chunkOverlap: 120,
        topK: 5,
        promptLength: 100,
        rows: [
          ["chunk-a", 0.72],
          ["chunk-b", 0.61],
        ],
      }),
      candidate: createTrace({
        queryId: "candidate-query",
        chunkSize: 1200,
        chunkOverlap: 40,
        topK: 3,
        promptLength: 150,
        rows: [
          ["chunk-b", 0.58],
          ["chunk-c", 0.42],
        ],
      }),
    });

    expect(
      comparison.settings
        .filter((setting) => setting.changed)
        .map((setting) => setting.key),
    ).toEqual(["topK", "chunkSize", "chunkOverlap"]);
    expect(comparison.retrieval).toMatchObject({
      baselineTopScore: 0.72,
      candidateTopScore: 0.58,
      baselineRetrievedCount: 2,
      candidateRetrievedCount: 2,
      baselinePromptChars: 100,
      candidatePromptChars: 150,
      topScoreDelta: -0.14,
      promptCharsDelta: 50,
      retrievedDelta: 0,
      sharedChunkIds: ["chunk-b"],
      baselineOnlyChunkIds: ["chunk-a"],
      candidateOnlyChunkIds: ["chunk-c"],
    });
  });

  test("returns a better verdict when the variant finds a stronger top match", () => {
    const comparison = buildExperimentComparison({
      baseline: createTrace({
        queryId: "baseline-query",
        chunkSize: 800,
        chunkOverlap: 120,
        topK: 5,
        promptLength: 100,
        rows: [
          ["chunk-a", 0.55],
          ["chunk-b", 0.48],
        ],
      }),
      candidate: createTrace({
        queryId: "candidate-query",
        chunkSize: 800,
        chunkOverlap: 120,
        topK: 5,
        promptLength: 100,
        rows: [
          ["chunk-a", 0.72],
          ["chunk-b", 0.48],
        ],
      }),
    });

    expect(comparison.verdict).toEqual({
      status: "better",
      title: "Retrieval improved",
      reason:
        "The variant found a stronger top match (+0.17 similarity) without changing the evidence set.",
    });
  });

  test("returns a worse verdict when the variant weakens the top match", () => {
    const comparison = buildExperimentComparison({
      baseline: createTrace({
        queryId: "baseline-query",
        chunkSize: 800,
        chunkOverlap: 120,
        topK: 5,
        promptLength: 100,
        rows: [
          ["chunk-a", 0.7],
          ["chunk-b", 0.62],
        ],
      }),
      candidate: createTrace({
        queryId: "candidate-query",
        chunkSize: 800,
        chunkOverlap: 120,
        topK: 5,
        promptLength: 100,
        rows: [
          ["chunk-a", 0.44],
          ["chunk-b", 0.62],
        ],
      }),
    });

    expect(comparison.verdict).toEqual({
      status: "worse",
      title: "Retrieval weakened",
      reason:
        "The variant lowered the top match (-0.26 similarity), so the answer may be less grounded.",
    });
  });

  test("returns a mixed verdict when the evidence changes without a stronger score", () => {
    const comparison = buildExperimentComparison({
      baseline: createTrace({
        queryId: "baseline-query",
        chunkSize: 800,
        chunkOverlap: 120,
        topK: 2,
        promptLength: 100,
        rows: [
          ["chunk-a", 0.7],
          ["chunk-b", 0.62],
        ],
      }),
      candidate: createTrace({
        queryId: "candidate-query",
        chunkSize: 800,
        chunkOverlap: 120,
        topK: 2,
        promptLength: 140,
        rows: [
          ["chunk-a", 0.7],
          ["chunk-c", 0.6],
        ],
      }),
    });

    expect(comparison.verdict).toEqual({
      status: "mixed",
      title: "Evidence changed",
      reason:
        "The top score stayed the same, but the variant swapped 1 chunk in and 1 chunk out and expanded the prompt by 40 characters.",
    });
  });

  test("returns an unchanged verdict when the variant has no practical effect", () => {
    const comparison = buildExperimentComparison({
      baseline: createTrace({
        queryId: "baseline-query",
        chunkSize: 800,
        chunkOverlap: 120,
        topK: 2,
        promptLength: 100,
        rows: [
          ["chunk-a", 0.7],
          ["chunk-b", 0.62],
        ],
      }),
      candidate: createTrace({
        queryId: "candidate-query",
        chunkSize: 800,
        chunkOverlap: 120,
        topK: 2,
        promptLength: 100,
        rows: [
          ["chunk-a", 0.7],
          ["chunk-b", 0.62],
        ],
      }),
    });

    expect(comparison.verdict).toEqual({
      status: "unchanged",
      title: "No practical effect",
      reason:
        "The variant kept the same top score, retrieved chunks, evidence set, and prompt length.",
    });
  });

  test("adds compact failure-mode notes for weak retrieval, missing context, and oversized chunks", () => {
    const comparison = buildExperimentComparison({
      baseline: createTrace({
        queryId: "baseline-query",
        chunkSize: 800,
        chunkOverlap: 120,
        topK: 5,
        promptLength: 100,
        rows: [["chunk-a", 0.7]],
      }),
      candidate: createTrace({
        queryId: "candidate-query",
        chunkSize: 1600,
        chunkOverlap: 40,
        topK: 5,
        promptLength: 220,
        rows: [],
      }),
    });

    expect(comparison.notes).toEqual([
      "Candidate retrieved no chunks, so the answer has no grounded context.",
      "Candidate top similarity is weak; try a smaller chunk size or broader top_k.",
      "Candidate chunk size is large enough to bury precise answers and inflate the prompt.",
    ]);
  });

  test("flags retrieved chunks that were not selected into the prompt context", () => {
    const comparison = buildExperimentComparison({
      baseline: createTrace({
        queryId: "baseline-query",
        chunkSize: 800,
        chunkOverlap: 120,
        topK: 5,
        promptLength: 100,
        rows: [["chunk-a", 0.7]],
      }),
      candidate: createTrace({
        queryId: "candidate-query",
        chunkSize: 800,
        chunkOverlap: 120,
        topK: 5,
        promptLength: 80,
        rows: [["chunk-b", 0.6]],
        contextChunkIds: [],
      }),
    });

    expect(comparison.notes).toContain(
      "Candidate retrieved chunks but none reached the prompt context.",
    );
  });
});

function createTrace(input: {
  queryId: string;
  topK: number;
  chunkSize: number;
  chunkOverlap: number;
  promptLength: number;
  rows: Array<[string, number]>;
  contextChunkIds?: string[];
}): RagTraceResponse {
  return {
    queryId: input.queryId,
    answer: "Answer",
    citations: [],
    trace: {
      settings: {
        topK: input.topK,
        chunkSize: input.chunkSize,
        chunkOverlap: input.chunkOverlap,
        embeddingMode: "standard",
      },
      corpus: {
        slug: "rag-concepts-primer",
        title: "RAG Concepts Primer",
        sourceKind: "example",
        documentCount: 1,
      },
      extraction: { documents: [] },
      chunking: { totalChunks: 2, chunks: [] },
      retrieval: {
        method: "deterministic-lexical-overlap",
        rows: input.rows.map(([chunkId, similarity], index) => ({
          chunkId,
          documentId: "doc-1",
          fileName: "rag-primer.md",
          chunkIndex: index,
          charStart: index * 10,
          charEnd: index * 10 + 9,
          content: `Chunk ${chunkId}`,
          rank: index + 1,
          similarity,
          selected: true,
          retrievalMode: "lexical",
          matchedTerms: [],
        })),
      },
      prompt: {
        rendered: "x".repeat(input.promptLength),
        contextChunkIds:
          input.contextChunkIds ?? input.rows.map(([chunkId]) => chunkId),
      },
      models: {
        embedding: { provider: "none", model: "local-lexical" },
        answer: { provider: "local", model: "extractive-summary" },
      },
      timingsMs: {
        total: 1,
        retrieval: 1,
        generation: 1,
      },
      persistence: {
        mode: "ephemeral",
        store: "local-example-runner",
      },
      warnings: [],
    },
  };
}
