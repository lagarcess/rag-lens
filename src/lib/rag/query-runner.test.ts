import { describe, expect, test } from "bun:test";

import { runExampleTrace } from "./query-runner";

describe("runExampleTrace", () => {
  test("returns an ephemeral trace for a curated corpus without provider calls", async () => {
    const result = await runExampleTrace({
      sessionId: null,
      corpusSlug: "rag-concepts-primer",
      question: "How does RAG improve answer trust?",
      topK: 3,
      chunkSize: 520,
      chunkOverlap: 80,
      embeddingMode: "standard",
    });

    expect(result.queryId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(result.answer).toContain("retrieved context");
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.trace.settings).toMatchObject({
      topK: 3,
      chunkSize: 520,
      chunkOverlap: 80,
      embeddingMode: "standard",
    });
    expect(result.trace.retrieval.method).toBe("deterministic-lexical-overlap");
    expect(result.trace.retrieval.rows[0].selected).toBe(true);
    expect(result.trace.prompt.contextChunkIds).toEqual(
      result.trace.retrieval.rows.map((row) => row.chunkId),
    );
    expect(result.trace.persistence).toEqual({
      mode: "ephemeral",
      store: "local-example-runner",
    });
    expect(result.trace.models.answer.provider).toBe("local");
    expect(result.trace.models.embedding.provider).toBe("none");
  });
});
