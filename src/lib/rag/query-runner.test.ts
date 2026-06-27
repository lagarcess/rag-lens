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

  test("uses an injected answer provider and records provider metadata", async () => {
    const result = await runExampleTrace(
      {
        sessionId: null,
        corpusSlug: "rag-concepts-primer",
        question: "How does RAG improve answer trust?",
        topK: 2,
        chunkSize: 520,
        chunkOverlap: 80,
        embeddingMode: "standard",
      },
      {
        answerProvider: async ({ prompt, citationCount }) => ({
          answer: `Model answer using ${citationCount} citations.`,
          provider: "openrouter",
          model: "deepseek/deepseek-v4-flash",
          finishReason: "stop",
          usage: {
            promptTokens: prompt.length,
            completionTokens: 8,
            totalTokens: prompt.length + 8,
          },
        }),
      },
    );

    expect(result.answer).toBe("Model answer using 2 citations.");
    expect(result.trace.models.answer).toMatchObject({
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      finishReason: "stop",
      usage: {
        completionTokens: 8,
      },
    });
  });

  test("uses an injected retrieval provider and records vector retrieval metadata", async () => {
    const result = await runExampleTrace(
      {
        sessionId: null,
        corpusSlug: "rag-concepts-primer",
        question: "How does RAG improve answer trust?",
        topK: 2,
        chunkSize: 520,
        chunkOverlap: 80,
        embeddingMode: "standard",
      },
      {
        retrievalProvider: async () => ({
          method: "supabase-pgvector-cosine",
          queryEmbeddingModel: "pplx-embed-v1-0.6b",
          documentEmbeddingModel: "pplx-embed-v1-0.6b",
          rows: [
            {
              chunkId: "chunk-1",
              documentId: "doc-1",
              fileName: "rag-primer.md",
              chunkIndex: 0,
              charStart: 0,
              charEnd: 42,
              content: "RAG grounds answers in retrieved context.",
              rank: 1,
              similarity: 0.91,
              selected: true,
              retrievalMode: "vector",
              matchedTerms: [],
              embeddingModel: "pplx-embed-v1-0.6b",
              embeddingMode: "standard",
            },
          ],
        }),
      },
    );

    expect(result.trace.retrieval.method).toBe("supabase-pgvector-cosine");
    expect(result.trace.retrieval.rows[0].retrievalMode).toBe("vector");
    expect(result.trace.models.embedding).toMatchObject({
      provider: "perplexity",
      model: "pplx-embed-v1-0.6b",
      queryModel: "pplx-embed-v1-0.6b",
      documentModel: "pplx-embed-v1-0.6b",
    });
  });
});
