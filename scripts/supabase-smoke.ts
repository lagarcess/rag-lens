import { getCleanupEnv, getPerplexityEmbeddingEnv } from "../src/lib/env";
import { getExampleCorpusSlugs } from "../src/lib/rag/example-corpus-manifest";
import { retrieveSupabaseVector } from "../src/lib/rag/supabase-vector";
import { cleanupExpiredUploads } from "../src/lib/uploads/upload-cleanup";
import {
  createSupabaseUploadCleanupRepository,
  createSupabaseUploadStorage,
} from "../src/lib/uploads/supabase-upload-store";
import { embedTextsWithPerplexity } from "../src/lib/rag/perplexity-embeddings";
import { createSupabaseAdminClient } from "../src/lib/supabase-admin";

export type SupabaseSmokeStageName =
  | "storage"
  | "examples"
  | "vector"
  | "cleanup-dry-run";

export interface SupabaseSmokeStage {
  name: SupabaseSmokeStageName;
  ok: true;
  detail: Record<string, unknown>;
}

export interface SupabaseSmokeResult {
  ok: true;
  mode: "read-only";
  timestamp: string;
  stages: SupabaseSmokeStage[];
}

export interface SupabaseSmokeChecks {
  storage(): Promise<Record<string, unknown>>;
  examples(): Promise<Record<string, unknown>>;
  vector(): Promise<Record<string, unknown>>;
  cleanupDryRun(): Promise<Record<string, unknown>>;
}

export interface SupabaseSmokeOptions {
  args: string[];
  checks?: SupabaseSmokeChecks;
  now?: () => string;
  writeOutput?: (line: string) => void;
}

export function parseSupabaseSmokeArgs(args: string[]) {
  const allowedFlags = new Set(["--json"]);
  const unknownFlag = args.find(
    (arg) => arg.startsWith("--") && !allowedFlags.has(arg),
  );

  if (unknownFlag) {
    throw new Error(`Unknown Supabase smoke flag: ${unknownFlag}`);
  }

  return {
    json: args.includes("--json"),
  };
}

export function formatSupabaseSmokeLog(result: SupabaseSmokeResult) {
  return JSON.stringify(result);
}

export function formatSupabaseSmokeErrorLog(input: {
  timestamp: string;
  error: unknown;
}) {
  return JSON.stringify({
    ok: false,
    error: "Supabase smoke failed",
    reason: getSafeSmokeErrorReason(),
    timestamp: input.timestamp,
  });
}

export async function runSupabaseSmoke(options: SupabaseSmokeOptions) {
  parseSupabaseSmokeArgs(options.args);

  const timestamp = options.now?.() ?? new Date().toISOString();
  const checks = options.checks ?? createHostedSupabaseSmokeChecks();
  const stages: SupabaseSmokeStage[] = [];

  stages.push({
    name: "storage",
    ok: true,
    detail: await checks.storage(),
  });
  stages.push({
    name: "examples",
    ok: true,
    detail: await checks.examples(),
  });
  stages.push({
    name: "vector",
    ok: true,
    detail: await checks.vector(),
  });
  stages.push({
    name: "cleanup-dry-run",
    ok: true,
    detail: await checks.cleanupDryRun(),
  });

  const result: SupabaseSmokeResult = {
    ok: true,
    mode: "read-only",
    timestamp,
    stages,
  };

  (options.writeOutput ?? console.log)(formatSupabaseSmokeLog(result));

  return result;
}

function createHostedSupabaseSmokeChecks(): SupabaseSmokeChecks {
  const supabase = createSupabaseAdminClient();
  const cleanupEnv = getCleanupEnv();
  const perplexity = getPerplexityEmbeddingEnv();

  return {
    storage: () =>
      verifyStorageBucket({
        bucket: cleanupEnv.SUPABASE_STORAGE_BUCKET,
        supabase,
      }),
    examples: () =>
      verifySeededExampleCorpora({
        embeddingModel: perplexity.standardEmbeddingModel,
        supabase,
      }),
    vector: () =>
      verifyVectorRetrieval({
        perplexity,
        supabase,
      }),
    cleanupDryRun: () =>
      verifyCleanupDryRun({
        bucket: cleanupEnv.SUPABASE_STORAGE_BUCKET,
        batchSize: cleanupEnv.CLEANUP_BATCH_SIZE,
      }),
  };
}

async function verifyStorageBucket(input: {
  bucket: string;
  supabase: SupabaseSmokeClient;
}) {
  const { error } = await input.supabase.storage
    .from(input.bucket)
    .list("", { limit: 1 });

  if (error) {
    throw new Error(error.message);
  }

  return {
    bucket: input.bucket,
    reachable: true,
  };
}

async function verifySeededExampleCorpora(input: {
  embeddingModel: string;
  supabase: SupabaseSmokeClient;
}) {
  const slugs = getExampleCorpusSlugs();
  const { data: corpora, error: corporaError } = await input.supabase
    .from("rag_corpora")
    .select("slug, is_example")
    .in("slug", slugs);

  if (corporaError) {
    throw new Error(corporaError.message);
  }

  const exampleCorpora = (corpora ?? []).filter(
    (corpus) => corpus.is_example === true,
  );
  let readyDocuments = 0;
  let indexedChunks = 0;

  for (const slug of slugs) {
    readyDocuments += await countRows(input.supabase, "rag_documents", (query) =>
      query
        .eq("source_kind", "example")
        .eq("corpus_slug", slug)
        .eq("status", "ready")
        .is("expires_at", null),
    );
    indexedChunks += await countRows(
      input.supabase,
      "rag_document_chunks",
      (query) =>
        query
          .eq("corpus_slug", slug)
          .eq("embedding_mode", "standard")
          .eq("embedding_model", input.embeddingModel)
          .is("expires_at", null),
    );
  }

  if (exampleCorpora.length !== slugs.length) {
    throw new Error("Hosted Supabase example corpora are not fully seeded.");
  }

  if (readyDocuments < slugs.length || indexedChunks < slugs.length) {
    throw new Error("Hosted Supabase example documents or chunks are missing.");
  }

  return {
    expectedCorpora: slugs.length,
    exampleCorpora: exampleCorpora.length,
    readyDocuments,
    indexedChunks,
  };
}

async function verifyVectorRetrieval(input: {
  perplexity: {
    apiKey: string;
    standardEmbeddingModel: string;
  };
  supabase: SupabaseSmokeClient;
}) {
  const corpusSlug = "rag-concepts-primer";
  const retrieval = await retrieveSupabaseVector({
    question: "How does RAG improve answer trust?",
    corpusSlug,
    topK: 2,
    supabase: input.supabase,
    queryEmbeddingModel: input.perplexity.standardEmbeddingModel,
    queryEmbedding: async (question) => {
      const [embedding] = await embedTextsWithPerplexity({
        apiKey: input.perplexity.apiKey,
        model: input.perplexity.standardEmbeddingModel,
        input: [question],
      });

      return embedding;
    },
  });

  if (retrieval.rows.length === 0) {
    throw new Error("Hosted Supabase vector retrieval returned zero rows.");
  }

  return {
    corpusSlug,
    retrievedRows: retrieval.rows.length,
    topSimilarity: Number(retrieval.rows[0].similarity.toFixed(4)),
  };
}

async function verifyCleanupDryRun(input: { bucket: string; batchSize: number }) {
  const result = await cleanupExpiredUploads({
    repository: createSupabaseUploadCleanupRepository(),
    storage: createSupabaseUploadStorage(),
    bucket: input.bucket,
    now: new Date().toISOString(),
    batchSize: input.batchSize,
    dryRun: true,
  });

  return {
    purgeableStorageObjects: result.purgeableStorageObjects,
    removedStorageObjects: result.removedStorageObjects,
  };
}

async function countRows(
  supabase: SupabaseSmokeClient,
  table: string,
  filter: (query: SupabaseSmokeQueryBuilder) => SupabaseSmokeQueryBuilder,
) {
  const query = supabase
    .from(table)
    .select("id", { count: "exact", head: true }) as unknown as SupabaseSmokeQueryBuilder;
  const { count, error } = await filter(query);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

function getSafeSmokeErrorReason() {
  return "Review Supabase env, migrations, seed data, storage bucket, and vector retrieval.";
}

type SupabaseSmokeClient = ReturnType<typeof createSupabaseAdminClient>;

interface SupabaseSmokeCountResult {
  count: number | null;
  data: Array<Record<string, unknown>> | null;
  error: { message: string } | null;
}

interface SupabaseSmokeQueryBuilder
  extends PromiseLike<SupabaseSmokeCountResult> {
  eq(column: string, value: unknown): SupabaseSmokeQueryBuilder;
  in(column: string, values: unknown[]): SupabaseSmokeQueryBuilder;
  is(column: string, value: null): SupabaseSmokeQueryBuilder;
  select(
    columns: string,
    options?: { count?: "exact"; head?: boolean },
  ): SupabaseSmokeQueryBuilder;
}

if (process.argv[1]?.endsWith("supabase-smoke.ts")) {
  const timestamp = new Date().toISOString();

  runSupabaseSmoke({ args: process.argv.slice(2) }).catch((error) => {
    console.error(formatSupabaseSmokeErrorLog({ timestamp, error }));
    process.exitCode = 1;
  });
}
