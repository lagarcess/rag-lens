import { getCleanupEnv, getPerplexityEmbeddingEnv } from "../src/lib/env";
import { RAG_LIMITS } from "../src/lib/rag-config";
import { createSessionTimestamps } from "../src/lib/rag-retention";
import { embedTextsWithPerplexity } from "../src/lib/rag/perplexity-embeddings";
import { runVectorTrace } from "../src/lib/rag/query-runner";
import { createSupabaseSessionSourceRepository } from "../src/lib/rag/supabase-session-source";
import { createSupabaseTracePersistenceRepository } from "../src/lib/rag/supabase-trace-store";
import { createSupabaseUploadIngestionRepository } from "../src/lib/rag/supabase-upload-ingestion-store";
import { retrieveSupabaseVector } from "../src/lib/rag/supabase-vector";
import {
  loadSessionTrace,
  persistSessionTrace,
} from "../src/lib/rag/trace-persistence";
import { ingestUploadedDocument } from "../src/lib/rag/upload-ingestion";
import { purgeAnonymousSessionNow } from "../src/lib/uploads/upload-cleanup";
import {
  createSupabaseUploadCleanupRepository,
  createSupabaseUploadRepository,
  createSupabaseUploadStorage,
} from "../src/lib/uploads/supabase-upload-store";
import { uploadDocumentFromFormData } from "../src/lib/uploads/upload-service";
import { createSupabaseAdminClient } from "../src/lib/supabase-admin";

export interface SupabaseIntegrationSmokeDetail {
  uploadedDocuments: number;
  indexedChunks: number;
  retrievedRows: number;
  persistedTraces: number;
  removedStorageObjects: number;
  rowsRemaining: number;
  storageObjectsRemaining: number;
}

export interface SupabaseIntegrationSmokeResult {
  ok: true;
  mode: "mutating-fixture";
  timestamp: string;
  detail: SupabaseIntegrationSmokeDetail;
}

export interface SupabaseIntegrationSmokeOptions {
  args: string[];
  runFixture?: () => Promise<SupabaseIntegrationSmokeDetail>;
  now?: () => string;
  writeOutput?: (line: string) => void;
}

export interface MutatingSupabaseFixtureRunner {
  createSession(): Promise<{
    sessionId: string;
    expiresAt: string;
    hardExpiresAt: string;
  }>;
  uploadDocument(sessionId: string): Promise<{
    documentId: string;
    storagePath: string;
    extractedCharacters: number;
  }>;
  queryAndPersistTrace(sessionId: string): Promise<{
    queryId: string;
    indexedChunks: number;
    retrievedRows: number;
    persistedTraces: number;
  }>;
  loadPersistedTrace(
    sessionId: string,
    queryId: string,
  ): Promise<{
    queryId: string;
    retrievedRows: number;
    persistenceMode: "session" | "ephemeral";
  }>;
  purgeSession(sessionId: string): Promise<{
    removedStorageObjects: number;
  }>;
  assertPurged(input: {
    sessionId: string;
    storagePath: string | null;
  }): Promise<{
    rowsRemaining: number;
    storageObjectsRemaining: number;
  }>;
}

export function parseSupabaseIntegrationSmokeArgs(args: string[]) {
  const allowedFlags = new Set(["--json"]);
  const unknownFlag = args.find(
    (arg) => arg.startsWith("--") && !allowedFlags.has(arg),
  );

  if (unknownFlag) {
    throw new Error(`Unknown Supabase integration smoke flag: ${unknownFlag}`);
  }

  return {
    json: args.includes("--json"),
  };
}

export function formatSupabaseIntegrationSmokeLog(
  result: SupabaseIntegrationSmokeResult,
) {
  return JSON.stringify(result);
}

export function formatSupabaseIntegrationSmokeErrorLog(input: {
  timestamp: string;
  error: unknown;
}) {
  return JSON.stringify({
    ok: false,
    error: "Supabase integration smoke failed",
    reason: getSafeIntegrationSmokeErrorReason(),
    timestamp: input.timestamp,
  });
}

export async function runSupabaseIntegrationSmoke(
  options: SupabaseIntegrationSmokeOptions,
) {
  parseSupabaseIntegrationSmokeArgs(options.args);

  const result: SupabaseIntegrationSmokeResult = {
    ok: true,
    mode: "mutating-fixture",
    timestamp: options.now?.() ?? new Date().toISOString(),
    detail: await (options.runFixture ?? createHostedIntegrationSmokeFixture)(),
  };

  (options.writeOutput ?? console.log)(
    formatSupabaseIntegrationSmokeLog(result),
  );

  return result;
}

export async function runMutatingSupabaseFixtureSmoke(
  runner: MutatingSupabaseFixtureRunner,
): Promise<SupabaseIntegrationSmokeDetail> {
  let sessionId: string | null = null;
  let storagePath: string | null = null;
  let detail: Pick<
    SupabaseIntegrationSmokeDetail,
    "uploadedDocuments" | "indexedChunks" | "retrievedRows" | "persistedTraces"
  > | null = null;
  let cleanupDetail = {
    removedStorageObjects: 0,
    rowsRemaining: 0,
    storageObjectsRemaining: 0,
  };

  try {
    const session = await runner.createSession();
    sessionId = session.sessionId;

    const upload = await runner.uploadDocument(sessionId);
    storagePath = upload.storagePath;

    const trace = await runner.queryAndPersistTrace(sessionId);
    const loadedTrace = await runner.loadPersistedTrace(
      sessionId,
      trace.queryId,
    );

    if (
      loadedTrace.queryId !== trace.queryId ||
      loadedTrace.persistenceMode !== "session" ||
      loadedTrace.retrievedRows < 1
    ) {
      throw new Error("Persisted trace fixture did not reload correctly.");
    }

    detail = {
      uploadedDocuments: 1,
      indexedChunks: trace.indexedChunks,
      retrievedRows: trace.retrievedRows,
      persistedTraces: trace.persistedTraces,
    };
  } finally {
    if (sessionId) {
      const purge = await runner.purgeSession(sessionId);
      const purged = await runner.assertPurged({ sessionId, storagePath });

      cleanupDetail = {
        removedStorageObjects: purge.removedStorageObjects,
        rowsRemaining: purged.rowsRemaining,
        storageObjectsRemaining: purged.storageObjectsRemaining,
      };
    }
  }

  if (!detail) {
    throw new Error("Mutating Supabase smoke fixture did not complete.");
  }

  return {
    ...detail,
    ...cleanupDetail,
  };
}

function createHostedIntegrationSmokeFixture() {
  const supabase = createSupabaseAdminClient();
  const cleanupEnv = getCleanupEnv();
  const perplexity = getPerplexityEmbeddingEnv();

  return runMutatingSupabaseFixtureSmoke(
    createHostedMutatingFixtureRunner({
      bucket: cleanupEnv.SUPABASE_STORAGE_BUCKET,
      perplexity,
      supabase,
    }),
  );
}

function createHostedMutatingFixtureRunner(input: {
  bucket: string;
  perplexity: {
    apiKey: string;
    standardEmbeddingModel: string;
  };
  supabase: SupabaseIntegrationSmokeClient;
}): MutatingSupabaseFixtureRunner {
  const question =
    "What does the hosted smoke document say about retrieval and cleanup?";

  return {
    createSession: () => createHostedSmokeSession(input.supabase),

    uploadDocument: async (sessionId) => {
      const formData = new FormData();
      formData.set("sessionId", sessionId);
      formData.set(
        "file",
        new File([getSmokeFixtureText()], "rag-lens-smoke.txt", {
          type: "text/plain",
        }),
      );

      return uploadDocumentFromFormData({
        formData,
        repository: createSupabaseUploadRepository(),
        storage: createSupabaseUploadStorage(),
        bucket: input.bucket,
        ingestor: async (document) => {
          await ingestUploadedDocument({
            document,
            repository: createSupabaseUploadIngestionRepository(),
            embeddingModel: input.perplexity.standardEmbeddingModel,
            embedTexts: (texts) =>
              embedTextsWithPerplexity({
                apiKey: input.perplexity.apiKey,
                model: input.perplexity.standardEmbeddingModel,
                input: texts,
              }),
          });
        },
      });
    },

    queryAndPersistTrace: async (sessionId) => {
      const request = {
        sessionId,
        corpusSlug: "session-uploads",
        question,
        topK: 1,
        chunkSize: RAG_LIMITS.defaultChunkSize,
        chunkOverlap: RAG_LIMITS.defaultChunkOverlap,
        embeddingMode: "standard" as const,
      };
      const source = await createSupabaseSessionSourceRepository()
        .loadActiveUploadSource({
          sessionId,
          now: new Date().toISOString(),
        });

      if (!source || source.documentCount < 1 || source.totalChunks < 1) {
        throw new Error("Mutating fixture upload was not indexed.");
      }

      const response = await runVectorTrace(request, {
        source,
        retrievalProvider: (retrievalInput) =>
          retrieveSupabaseVector({
            question: retrievalInput.question,
            sessionId: retrievalInput.sessionId,
            topK: retrievalInput.topK,
            supabase: input.supabase,
            queryEmbeddingModel: input.perplexity.standardEmbeddingModel,
            queryEmbedding: async (query) => {
              const [embedding] = await embedTextsWithPerplexity({
                apiKey: input.perplexity.apiKey,
                model: input.perplexity.standardEmbeddingModel,
                input: [query],
              });

              return embedding;
            },
          }),
      });

      if (response.trace.retrieval.rows.length < 1) {
        throw new Error("Mutating fixture vector retrieval returned zero rows.");
      }

      await persistSessionTrace({
        repository: createSupabaseTracePersistenceRepository(),
        sessionId,
        request,
        response,
        now: new Date().toISOString(),
      });

      return {
        queryId: response.queryId,
        indexedChunks: source.totalChunks,
        retrievedRows: response.trace.retrieval.rows.length,
        persistedTraces: 1,
      };
    },

    loadPersistedTrace: async (sessionId, queryId) => {
      const response = await loadSessionTrace({
        repository: createSupabaseTracePersistenceRepository(),
        sessionId,
        queryId,
        now: new Date().toISOString(),
      });

      return {
        queryId: response.queryId,
        retrievedRows: response.trace.retrieval.rows.length,
        persistenceMode: response.trace.persistence.mode,
      };
    },

    purgeSession: async (sessionId) => {
      const purge = await purgeAnonymousSessionNow({
        repository: createSupabaseUploadCleanupRepository(),
        storage: createSupabaseUploadStorage(),
        bucket: input.bucket,
        now: new Date().toISOString(),
        sessionId,
      });

      if (!purge) {
        throw new Error("Mutating fixture session could not be purged.");
      }

      return {
        removedStorageObjects: purge.removedStorageObjects,
      };
    },

    assertPurged: ({ sessionId, storagePath }) =>
      assertHostedSmokeFixturePurged({
        bucket: input.bucket,
        sessionId,
        storagePath,
        supabase: input.supabase,
      }),
  };
}

async function createHostedSmokeSession(
  supabase: SupabaseIntegrationSmokeClient,
) {
  const timestamps = createSessionTimestamps();
  const { data, error } = await supabase
    .from("rag_sessions")
    .insert({
      mode: "anonymous",
      status: "active",
      client_label: "rag-lens-smoke",
      created_at: timestamps.createdAt,
      last_seen_at: timestamps.createdAt,
      expires_at: timestamps.expiresAt,
      hard_expires_at: timestamps.hardExpiresAt,
    })
    .select("id, expires_at, hard_expires_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    sessionId: data.id,
    expiresAt: data.expires_at,
    hardExpiresAt: data.hard_expires_at,
  };
}

async function assertHostedSmokeFixturePurged(input: {
  bucket: string;
  sessionId: string;
  storagePath: string | null;
  supabase: SupabaseIntegrationSmokeClient;
}) {
  const rowsRemaining = await countSessionRows(input.supabase, input.sessionId);
  const storageObjectsRemaining = input.storagePath
    ? await countStorageObjects(input.supabase, input.bucket, input.storagePath)
    : 0;

  if (rowsRemaining > 0 || storageObjectsRemaining > 0) {
    throw new Error("Mutating fixture purge left hosted data behind.");
  }

  return {
    rowsRemaining,
    storageObjectsRemaining,
  };
}

async function countSessionRows(
  supabase: SupabaseIntegrationSmokeClient,
  sessionId: string,
) {
  const tables = [
    "rag_sessions",
    "rag_documents",
    "rag_document_chunks",
    "rag_queries",
    "rag_retrievals",
  ];
  let total = 0;

  for (const table of tables) {
    total += await countRows(supabase, table, (query) =>
      table === "rag_sessions"
        ? query.eq("id", sessionId)
        : query.eq("session_id", sessionId),
    );
  }

  return total;
}

async function countStorageObjects(
  supabase: SupabaseIntegrationSmokeClient,
  bucket: string,
  storagePath: string,
) {
  const lastSlash = storagePath.lastIndexOf("/");
  const folder = lastSlash === -1 ? "" : storagePath.slice(0, lastSlash);
  const name = lastSlash === -1 ? storagePath : storagePath.slice(lastSlash + 1);
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 100,
    search: name,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).filter((item) => item.name === name).length;
}

async function countRows(
  supabase: SupabaseIntegrationSmokeClient,
  table: string,
  filter: (
    query: SupabaseIntegrationSmokeQueryBuilder,
  ) => SupabaseIntegrationSmokeQueryBuilder,
) {
  const query = supabase
    .from(table)
    .select("id", {
      count: "exact",
      head: true,
    }) as unknown as SupabaseIntegrationSmokeQueryBuilder;
  const { count, error } = await filter(query);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

function getSmokeFixtureText() {
  return [
    "RAG Lens hosted smoke fixture.",
    "The fixture says retrieval should cite temporary uploaded notes before answering.",
    "The fixture also says cleanup must remove uploaded storage objects and session rows after the trace.",
  ].join("\n");
}

function getSafeIntegrationSmokeErrorReason() {
  return "Review Supabase env, upload ingestion, vector retrieval, trace persistence, and cleanup.";
}

type SupabaseIntegrationSmokeClient = ReturnType<
  typeof createSupabaseAdminClient
>;

interface SupabaseIntegrationSmokeCountResult {
  count: number | null;
  data: Array<Record<string, unknown>> | null;
  error: { message: string } | null;
}

interface SupabaseIntegrationSmokeQueryBuilder
  extends PromiseLike<SupabaseIntegrationSmokeCountResult> {
  eq(column: string, value: unknown): SupabaseIntegrationSmokeQueryBuilder;
  select(
    columns: string,
    options?: { count?: "exact"; head?: boolean },
  ): SupabaseIntegrationSmokeQueryBuilder;
}

if (process.argv[1]?.endsWith("supabase-integration-smoke.ts")) {
  const timestamp = new Date().toISOString();

  runSupabaseIntegrationSmoke({ args: process.argv.slice(2) }).catch(
    (error) => {
      console.error(formatSupabaseIntegrationSmokeErrorLog({ timestamp, error }));
      process.exitCode = 1;
    },
  );
}
