import { describe, expect, test } from "bun:test";

import {
  listSessionTraceSummaries,
  loadSessionTrace,
  persistSessionTrace,
  type TracePersistenceRepository,
} from "./trace-persistence";
import type { RagTraceResponse } from "./trace";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const QUERY_ID = "33333333-3333-4333-8333-333333333333";
const CHUNK_ID = "22222222-2222-4222-8222-222222222222";
const NOW = "2026-06-27T12:00:00.000Z";
const EXPIRES_AT = "2026-06-27T18:00:00.000Z";
const HARD_EXPIRES_AT = "2026-06-28T12:00:00.000Z";

describe("persistSessionTrace", () => {
  test("stores the query, retrieval rows, trace JSON, and session retention", async () => {
    const repository = createFakeRepository();
    const response = createTraceResponse();

    const persisted = await persistSessionTrace({
      repository,
      sessionId: SESSION_ID,
      request: {
        sessionId: SESSION_ID,
        corpusSlug: "session-uploads",
        question: "How does RAG improve trust?",
        topK: 3,
        chunkSize: 800,
        chunkOverlap: 120,
        embeddingMode: "standard",
      },
      response,
      now: NOW,
    });

    expect(persisted.queryId).toBe(QUERY_ID);
    expect(persisted.trace.persistence).toEqual({
      mode: "session",
      store: "supabase-trace-history",
    });
    expect(repository.insertedQuery).toMatchObject({
      id: QUERY_ID,
      session_id: SESSION_ID,
      corpus_slug: null,
      question: "How does RAG improve trust?",
      answer: "RAG improves trust by citing retrieved chunks.",
      answer_model: "deepseek/deepseek-v4-flash",
      embedding_model: "pplx-embed-v1-0.6b",
      top_k: 3,
      chunk_size: 800,
      chunk_overlap: 120,
      prompt: "Use the retrieved context.",
      expires_at: EXPIRES_AT,
      hard_expires_at: HARD_EXPIRES_AT,
    });
    expect(repository.insertedQuery?.trace).toMatchObject({
      corpus: { sourceKind: "upload" },
      persistence: {
        mode: "session",
        store: "supabase-trace-history",
      },
    });
    expect(repository.insertedRetrievals).toEqual([
      expect.objectContaining({
        query_id: QUERY_ID,
        session_id: SESSION_ID,
        chunk_id: CHUNK_ID,
        rank: 1,
        similarity: 0.91,
        distance: 0.09,
        selected: true,
        expires_at: EXPIRES_AT,
        hard_expires_at: HARD_EXPIRES_AT,
      }),
    ]);
  });

  test("does not store traces for inactive or expired sessions", async () => {
    const repository = createFakeRepository({ activeSession: null });

    await expect(
      persistSessionTrace({
        repository,
        sessionId: SESSION_ID,
        request: {
          sessionId: SESSION_ID,
          corpusSlug: "session-uploads",
          question: "How does RAG improve trust?",
          topK: 3,
          chunkSize: 800,
          chunkOverlap: 120,
          embeddingMode: "standard",
        },
        response: createTraceResponse(),
        now: NOW,
      }),
    ).rejects.toThrow("Session not found or expired");

    expect(repository.insertedQuery).toBeNull();
    expect(repository.insertedRetrievals).toEqual([]);
  });

  test("rolls back the query row when retrieval persistence fails", async () => {
    const repository = createFakeRepository({ failRetrievalInsert: true });

    await expect(
      persistSessionTrace({
        repository,
        sessionId: SESSION_ID,
        request: {
          sessionId: SESSION_ID,
          corpusSlug: "session-uploads",
          question: "How does RAG improve trust?",
          topK: 3,
          chunkSize: 800,
          chunkOverlap: 120,
          embeddingMode: "standard",
        },
        response: createTraceResponse(),
        now: NOW,
      }),
    ).rejects.toThrow("retrieval insert failed");

    expect(repository.insertedQuery?.id).toBe(QUERY_ID);
    expect(repository.deletedQueryId).toBe(QUERY_ID);
  });
});

describe("session trace history", () => {
  test("lists recent trace summaries scoped to an active session", async () => {
    const repository = createFakeRepository({
      storedQueries: [
        {
          id: QUERY_ID,
          question: "How does RAG improve trust?",
          answer: "RAG improves trust by citing retrieved chunks.",
          trace: createTraceResponse().trace,
          created_at: NOW,
        },
      ],
    });

    const summaries = await listSessionTraceSummaries({
      repository,
      sessionId: SESSION_ID,
      now: NOW,
      limit: 8,
    });

    expect(summaries).toEqual([
      {
        queryId: QUERY_ID,
        question: "How does RAG improve trust?",
        answerPreview: "RAG improves trust by citing retrieved chunks.",
        sourceTitle: "Uploaded documents",
        sourceKind: "upload",
        retrievedCount: 1,
        createdAt: NOW,
      },
    ]);
  });

  test("loads a persisted trace only while the session is active", async () => {
    const repository = createFakeRepository({
      storedTrace: {
        id: QUERY_ID,
        answer: "RAG improves trust by citing retrieved chunks.",
        trace: createTraceResponse().trace,
      },
    });

    const loaded = await loadSessionTrace({
      repository,
      sessionId: SESSION_ID,
      queryId: QUERY_ID,
      now: NOW,
    });

    expect(loaded.queryId).toBe(QUERY_ID);
    expect(loaded.answer).toBe("RAG improves trust by citing retrieved chunks.");
    expect(loaded.citations).toEqual([
      {
        rank: 1,
        chunkId: CHUNK_ID,
        fileName: "notes.md",
        similarity: 0.91,
      },
    ]);

    const expiredRepository = createFakeRepository({ activeSession: null });
    await expect(
      loadSessionTrace({
        repository: expiredRepository,
        sessionId: SESSION_ID,
        queryId: QUERY_ID,
        now: NOW,
      }),
    ).rejects.toThrow("Session not found or expired");
  });
});

function createTraceResponse(): RagTraceResponse {
  return {
    queryId: QUERY_ID,
    answer: "RAG improves trust by citing retrieved chunks.",
    citations: [
      {
        rank: 1,
        chunkId: CHUNK_ID,
        fileName: "notes.md",
        similarity: 0.91,
      },
    ],
    trace: {
      settings: {
        topK: 3,
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
            documentId: "44444444-4444-4444-8444-444444444444",
            fileName: "notes.md",
            characterCount: 120,
          },
        ],
      },
      chunking: {
        totalChunks: 1,
        chunks: [
          {
            chunkId: CHUNK_ID,
            documentId: "44444444-4444-4444-8444-444444444444",
            fileName: "notes.md",
            chunkIndex: 0,
            charStart: 0,
            charEnd: 80,
            content: "RAG grounds answers in retrieved source material.",
          },
        ],
      },
      retrieval: {
        method: "supabase-pgvector-cosine",
        rows: [
          {
            chunkId: CHUNK_ID,
            documentId: "44444444-4444-4444-8444-444444444444",
            fileName: "notes.md",
            chunkIndex: 0,
            charStart: 0,
            charEnd: 80,
            content: "RAG grounds answers in retrieved source material.",
            rank: 1,
            similarity: 0.91,
            distance: 0.09,
            selected: true,
            retrievalMode: "vector",
            matchedTerms: [],
            embeddingModel: "pplx-embed-v1-0.6b",
            embeddingMode: "standard",
          },
        ],
      },
      prompt: {
        rendered: "Use the retrieved context.",
        contextChunkIds: [CHUNK_ID],
      },
      models: {
        embedding: {
          provider: "perplexity",
          model: "pplx-embed-v1-0.6b",
          queryModel: "pplx-embed-v1-0.6b",
          documentModel: "pplx-embed-v1-0.6b",
        },
        answer: {
          provider: "openrouter",
          model: "deepseek/deepseek-v4-flash",
        },
      },
      timingsMs: {
        total: 420,
        retrieval: 90,
        generation: 330,
      },
      persistence: {
        mode: "ephemeral",
        store: "supabase-session-vectors",
      },
      warnings: [],
    },
  };
}

function createFakeRepository(options: {
  activeSession?: Awaited<
    ReturnType<TracePersistenceRepository["findActiveSession"]>
  >;
  storedQueries?: Awaited<
    ReturnType<TracePersistenceRepository["listRecentQueries"]>
  >;
  storedTrace?: Awaited<
    ReturnType<TracePersistenceRepository["loadQueryTrace"]>
  >;
  failRetrievalInsert?: boolean;
} = {}) {
  const repository: TracePersistenceRepository & {
    insertedQuery: Parameters<TracePersistenceRepository["insertQuery"]>[0] | null;
    insertedRetrievals: Parameters<
      TracePersistenceRepository["insertRetrievals"]
    >[0];
    deletedQueryId: string | null;
  } = {
    insertedQuery: null,
    insertedRetrievals: [],
    deletedQueryId: null,
    async findActiveSession() {
      return options.activeSession === undefined
        ? {
            id: SESSION_ID,
            expiresAt: EXPIRES_AT,
            hardExpiresAt: HARD_EXPIRES_AT,
          }
        : options.activeSession;
    },
    async insertQuery(row) {
      repository.insertedQuery = row;
    },
    async insertRetrievals(rows) {
      if (options.failRetrievalInsert) {
        throw new Error("retrieval insert failed");
      }

      repository.insertedRetrievals = rows;
    },
    async deleteQuery(queryId) {
      repository.deletedQueryId = queryId;
    },
    async listRecentQueries() {
      return options.storedQueries ?? [];
    },
    async loadQueryTrace() {
      return options.storedTrace ?? null;
    },
  };

  return repository;
}
