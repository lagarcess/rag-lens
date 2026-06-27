import { describe, expect, test } from "bun:test";

import { runTraceQuery } from "./workbench-api";

describe("runTraceQuery", () => {
  test("posts the query payload and returns the trace response", async () => {
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push({ url: String(url), init });

      return new Response(
        JSON.stringify({
          queryId: "query-1",
          answer: "Answer",
          citations: [],
          trace: {
            retrieval: { method: "deterministic-lexical-overlap", rows: [] },
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };

    const result = await runTraceQuery(
      {
        sessionId: null,
        corpusSlug: "rag-concepts-primer",
        question: "How does RAG improve trust?",
        topK: 5,
        chunkSize: 800,
        chunkOverlap: 120,
        embeddingMode: "standard",
      },
      fetchFn,
    );

    expect(result.queryId).toBe("query-1");
    expect(fetchCalls[0].url).toBe("/api/query");
    expect(fetchCalls[0].init?.method).toBe("POST");
    expect(JSON.parse(String(fetchCalls[0].init?.body))).toMatchObject({
      corpusSlug: "rag-concepts-primer",
      question: "How does RAG improve trust?",
    });
  });

  test("throws a sanitized error for non-OK responses", async () => {
    const fetchFn = async () =>
      new Response(JSON.stringify({ error: "Invalid query request" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });

    await expect(
      runTraceQuery(
        {
          sessionId: null,
          corpusSlug: "rag-concepts-primer",
          question: "",
          topK: 5,
          chunkSize: 800,
          chunkOverlap: 120,
          embeddingMode: "standard",
        },
        fetchFn,
      ),
    ).rejects.toThrow("Invalid query request");
  });
});
