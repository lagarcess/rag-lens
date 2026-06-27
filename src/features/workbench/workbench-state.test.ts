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

  test("tracks anonymous session and upload state", () => {
    const initial = createInitialWorkbenchState();
    const creating = workbenchReducer(initial, { type: "sessionCreateStarted" });

    expect(creating.session.status).toBe("creating");

    const active = workbenchReducer(creating, {
      type: "sessionCreated",
      session: {
        sessionId: "11111111-1111-4111-8111-111111111111",
        expiresAt: "2026-06-27T12:00:00.000Z",
        hardExpiresAt: "2026-06-28T10:00:00.000Z",
      },
    });

    expect(active.session).toMatchObject({
      status: "active",
      sessionId: "11111111-1111-4111-8111-111111111111",
      error: null,
    });

    const uploading = workbenchReducer(active, {
      type: "uploadStarted",
      fileName: "notes.md",
    });

    expect(uploading.uploads.status).toBe("uploading");
    expect(uploading.uploads.documents[0]).toMatchObject({
      fileName: "notes.md",
      status: "processing",
    });

    const uploaded = workbenchReducer(uploading, {
      type: "uploadSucceeded",
      document: {
        documentId: "22222222-2222-4222-8222-222222222222",
        sessionId: "11111111-1111-4111-8111-111111111111",
        fileName: "notes.md",
        mimeType: "text/markdown",
        byteSize: 19,
        status: "ready",
        extractedCharacters: 19,
        expiresAt: "2026-06-27T12:00:00.000Z",
        hardExpiresAt: "2026-06-28T10:00:00.000Z",
      },
    });

    expect(uploaded.uploads.status).toBe("ready");
    expect(uploaded.uploads.documents[0]).toMatchObject({
      documentId: "22222222-2222-4222-8222-222222222222",
      status: "ready",
      extractedCharacters: 19,
    });
    expect(uploaded.sources).toContainEqual(
      expect.objectContaining({
        slug: "session-uploads",
        title: "Uploaded documents",
        status: "ready",
        documentCount: 1,
      }),
    );

    const failed = workbenchReducer(uploaded, {
      type: "uploadFailed",
      error: "Upload failed",
    });

    expect(failed.uploads.status).toBe("error");
    expect(failed.uploads.error).toBe("Upload failed");

    const deleting = workbenchReducer(uploaded, { type: "sessionDeleteStarted" });
    expect(deleting.session.status).toBe("deleting");

    const deleted = workbenchReducer(deleting, { type: "sessionDeleted" });
    expect(deleted.session).toMatchObject({
      status: "idle",
      sessionId: null,
      expiresAt: null,
      hardExpiresAt: null,
    });
    expect(deleted.uploads.documents).toEqual([]);
    expect(
      deleted.sources.some((source) => source.slug === "session-uploads"),
    ).toBe(false);
    expect(deleted.selectedCorpusSlug).toBe("rag-concepts-primer");
  });

  test("selects the session upload source after upload success and sends session scope", () => {
    const initial = createInitialWorkbenchState();
    const active = workbenchReducer(initial, {
      type: "sessionCreated",
      session: {
        sessionId: "11111111-1111-4111-8111-111111111111",
        expiresAt: "2026-06-27T12:00:00.000Z",
        hardExpiresAt: "2026-06-28T10:00:00.000Z",
      },
    });
    const uploaded = workbenchReducer(active, {
      type: "uploadSucceeded",
      document: {
        documentId: "22222222-2222-4222-8222-222222222222",
        sessionId: "11111111-1111-4111-8111-111111111111",
        fileName: "notes.md",
        mimeType: "text/markdown",
        byteSize: 19,
        status: "ready",
        extractedCharacters: 19,
        expiresAt: "2026-06-27T12:00:00.000Z",
        hardExpiresAt: "2026-06-28T10:00:00.000Z",
      },
    });

    expect(uploaded.selectedCorpusSlug).toBe("session-uploads");
    expect(uploaded.sources.find((source) => source.slug === "session-uploads"))
      .toMatchObject({
        sourceKind: "upload",
        sessionId: "11111111-1111-4111-8111-111111111111",
        documentCount: 1,
      });
  });
});
