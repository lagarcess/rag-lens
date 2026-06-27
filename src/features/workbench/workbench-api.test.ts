import { describe, expect, test } from "bun:test";

import {
  createAnonymousSession,
  deleteAnonymousSession,
  runTraceQuery,
  uploadDocument,
} from "./workbench-api";

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

  test("includes the anonymous session id when querying uploaded documents", async () => {
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push({ url: String(url), init });

      return new Response(
        JSON.stringify({
          queryId: "query-1",
          answer: "Answer",
          citations: [],
          trace: {
            retrieval: { method: "supabase-pgvector-cosine", rows: [] },
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };

    await runTraceQuery(
      {
        sessionId: "11111111-1111-4111-8111-111111111111",
        corpusSlug: "session-uploads",
        question: "What did I upload?",
        topK: 5,
        chunkSize: 800,
        chunkOverlap: 120,
        embeddingMode: "standard",
      },
      fetchFn,
    );

    expect(JSON.parse(String(fetchCalls[0].init?.body))).toMatchObject({
      sessionId: "11111111-1111-4111-8111-111111111111",
      corpusSlug: "session-uploads",
    });
  });
});

describe("createAnonymousSession", () => {
  test("posts to the session route and returns session metadata", async () => {
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push({ url: String(url), init });

      return new Response(
        JSON.stringify({
          sessionId: "11111111-1111-4111-8111-111111111111",
          expiresAt: "2026-06-27T12:00:00.000Z",
          hardExpiresAt: "2026-06-28T10:00:00.000Z",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };

    const result = await createAnonymousSession(fetchFn);

    expect(fetchCalls[0]).toMatchObject({
      url: "/api/sessions",
      init: { method: "POST" },
    });
    expect(result.sessionId).toBe("11111111-1111-4111-8111-111111111111");
  });
});

describe("uploadDocument", () => {
  test("posts multipart form data without overriding the content type", async () => {
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
    const file = new File(["RAG improves trust."], "notes.md", {
      type: "text/markdown",
    });
    const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push({ url: String(url), init });

      return new Response(
        JSON.stringify({
          documentId: "22222222-2222-4222-8222-222222222222",
          sessionId: "11111111-1111-4111-8111-111111111111",
          fileName: "notes.md",
          mimeType: "text/markdown",
          byteSize: 19,
          status: "ready",
          extractedCharacters: 19,
          expiresAt: "2026-06-27T12:00:00.000Z",
          hardExpiresAt: "2026-06-28T10:00:00.000Z",
        }),
        {
          status: 201,
          headers: { "content-type": "application/json" },
        },
      );
    };

    const result = await uploadDocument(
      {
        sessionId: "11111111-1111-4111-8111-111111111111",
        file,
      },
      fetchFn,
    );

    expect(fetchCalls[0].url).toBe("/api/uploads");
    expect(fetchCalls[0].init?.method).toBe("POST");
    expect(fetchCalls[0].init?.headers).toBeUndefined();
    expect(fetchCalls[0].init?.body).toBeInstanceOf(FormData);
    expect(result).toMatchObject({
      documentId: "22222222-2222-4222-8222-222222222222",
      fileName: "notes.md",
      status: "ready",
    });
  });
});

describe("deleteAnonymousSession", () => {
  test("deletes the active session", async () => {
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push({ url: String(url), init });

      return new Response(
        JSON.stringify({
          ok: true,
          sessionId: "11111111-1111-4111-8111-111111111111",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };

    await expect(
      deleteAnonymousSession(
        "11111111-1111-4111-8111-111111111111",
        fetchFn,
      ),
    ).resolves.toEqual({
      ok: true,
      sessionId: "11111111-1111-4111-8111-111111111111",
    });
    expect(fetchCalls[0]).toMatchObject({
      url: "/api/sessions/11111111-1111-4111-8111-111111111111",
      init: { method: "DELETE" },
    });
  });
});
