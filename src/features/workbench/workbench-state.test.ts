import { describe, expect, test } from "bun:test";

import {
  createInitialWorkbenchState,
  workbenchReducer,
} from "./workbench-state";

describe("workbenchReducer", () => {
  test("tracks question edits, loading state, successful trace, and errors", () => {
    const initial = createInitialWorkbenchState();
    const edited = workbenchReducer(initial, {
      type: "questionChanged",
      question: "How does RAG improve trust?",
    });

    expect(edited.question).toBe("How does RAG improve trust?");

    const loading = workbenchReducer(edited, { type: "queryStarted" });
    expect(loading.query.status).toBe("loading");
    expect(loading.query.error).toBeNull();

    const success = workbenchReducer(loading, {
      type: "querySucceeded",
      result: {
        queryId: "query-1",
        answer: "Answer from model",
        citations: [],
        trace: {
          settings: {
            topK: 5,
            chunkSize: 800,
            chunkOverlap: 120,
            embeddingMode: "standard",
          },
          corpus: {
            slug: "rag-concepts-primer",
            title: "RAG Concepts Primer",
            sourceKind: "example",
            documentCount: 1,
          },
          extraction: { documents: [] },
          chunking: { totalChunks: 0, chunks: [] },
          retrieval: {
            method: "deterministic-lexical-overlap",
            rows: [],
          },
          prompt: { rendered: "Prompt", contextChunkIds: [] },
          models: {
            embedding: { provider: "none", model: "local-lexical" },
            answer: { provider: "openrouter", model: "model" },
          },
          timingsMs: { total: 1, retrieval: 1, generation: 1 },
          persistence: {
            mode: "ephemeral",
            store: "local-example-runner",
          },
          warnings: [],
        },
      },
    });

    expect(success.query.status).toBe("success");
    expect(success.query.result?.answer).toBe("Answer from model");

    const error = workbenchReducer(success, {
      type: "queryFailed",
      error: "The request failed",
    });

    expect(error.query.status).toBe("error");
    expect(error.query.error).toBe("The request failed");
    expect(error.query.result?.answer).toBe("Answer from model");
  });
});
