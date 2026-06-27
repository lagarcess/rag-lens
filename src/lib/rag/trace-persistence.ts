import type {
  RagCitation,
  RagQueryRequest,
  RagRetrievalRow,
  RagTrace,
  RagTraceResponse,
} from "./trace";

export interface TraceSessionRecord {
  id: string;
  expiresAt: string;
  hardExpiresAt: string;
}

export interface PersistTraceQueryInsert {
  id: string;
  session_id: string;
  corpus_slug: string | null;
  question: string;
  answer: string;
  answer_model: string | null;
  embedding_model: string | null;
  top_k: number;
  chunk_size: number;
  chunk_overlap: number;
  prompt: string | null;
  trace: RagTrace;
  expires_at: string;
  hard_expires_at: string;
}

export interface PersistTraceRetrievalInsert {
  query_id: string;
  chunk_id: string;
  rank: number;
  similarity: number;
  distance: number;
  selected: boolean;
  session_id: string;
  expires_at: string;
  hard_expires_at: string;
}

export interface PersistedTraceSummaryRow {
  id: string;
  question: string;
  answer: string | null;
  trace: RagTrace;
  created_at: string;
}

export interface PersistedTraceRow {
  id: string;
  answer: string | null;
  trace: RagTrace;
}

export interface TracePersistenceRepository {
  findActiveSession(input: {
    sessionId: string;
    now: string;
  }): Promise<TraceSessionRecord | null>;
  insertQuery(row: PersistTraceQueryInsert): Promise<void>;
  insertRetrievals(rows: PersistTraceRetrievalInsert[]): Promise<void>;
  deleteQuery(queryId: string): Promise<void>;
  listRecentQueries(input: {
    sessionId: string;
    now: string;
    limit: number;
  }): Promise<PersistedTraceSummaryRow[]>;
  loadQueryTrace(input: {
    sessionId: string;
    queryId: string;
    now: string;
  }): Promise<PersistedTraceRow | null>;
}

export interface TraceSummary {
  queryId: string;
  question: string;
  answerPreview: string;
  sourceTitle: string;
  sourceKind: "example" | "upload";
  retrievedCount: number;
  createdAt: string;
}

export class TracePersistenceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "TracePersistenceError";
  }
}

export async function persistSessionTrace(input: {
  repository: TracePersistenceRepository;
  sessionId: string;
  request: RagQueryRequest;
  response: RagTraceResponse;
  now: string;
}): Promise<RagTraceResponse> {
  const session = await requireActiveSession(input);
  const response = markTracePersisted(input.response);

  await input.repository.insertQuery({
    id: response.queryId,
    session_id: input.sessionId,
    corpus_slug:
      response.trace.corpus.sourceKind === "example"
        ? input.request.corpusSlug
        : null,
    question: input.request.question,
    answer: response.answer,
    answer_model: response.trace.models.answer.model ?? null,
    embedding_model:
      response.trace.models.embedding.queryModel ??
      response.trace.models.embedding.model ??
      null,
    top_k: input.request.topK,
    chunk_size: input.request.chunkSize,
    chunk_overlap: input.request.chunkOverlap,
    prompt: response.trace.prompt.rendered,
    trace: response.trace,
    expires_at: session.expiresAt,
    hard_expires_at: session.hardExpiresAt,
  });

  try {
    await input.repository.insertRetrievals(
      buildRetrievalInserts({
        queryId: response.queryId,
        sessionId: input.sessionId,
        expiresAt: session.expiresAt,
        hardExpiresAt: session.hardExpiresAt,
        rows: response.trace.retrieval.rows,
      }),
    );
  } catch (error) {
    await input.repository.deleteQuery(response.queryId).catch(() => undefined);
    throw error;
  }

  return response;
}

export async function listSessionTraceSummaries(input: {
  repository: TracePersistenceRepository;
  sessionId: string;
  now: string;
  limit: number;
}): Promise<TraceSummary[]> {
  await requireActiveSession(input);

  const rows = await input.repository.listRecentQueries({
    sessionId: input.sessionId,
    now: input.now,
    limit: input.limit,
  });

  return rows.map((row) => ({
    queryId: row.id,
    question: row.question,
    answerPreview: createAnswerPreview(row.answer ?? ""),
    sourceTitle: row.trace.corpus.title,
    sourceKind: row.trace.corpus.sourceKind,
    retrievedCount: row.trace.retrieval.rows.length,
    createdAt: row.created_at,
  }));
}

export async function loadSessionTrace(input: {
  repository: TracePersistenceRepository;
  sessionId: string;
  queryId: string;
  now: string;
}): Promise<RagTraceResponse> {
  await requireActiveSession(input);

  const row = await input.repository.loadQueryTrace({
    sessionId: input.sessionId,
    queryId: input.queryId,
    now: input.now,
  });

  if (!row) {
    throw new TracePersistenceError("Trace not found", 404);
  }

  const trace = markTracePersisted({
    queryId: row.id,
    answer: row.answer ?? "",
    citations: [],
    trace: row.trace,
  }).trace;

  return {
    queryId: row.id,
    answer: row.answer ?? "",
    citations: buildCitations(trace.retrieval.rows),
    trace,
  };
}

function markTracePersisted(response: RagTraceResponse): RagTraceResponse {
  return {
    ...response,
    trace: {
      ...response.trace,
      persistence: {
        mode: "session",
        store: "supabase-trace-history",
      },
    },
  };
}

async function requireActiveSession(input: {
  repository: TracePersistenceRepository;
  sessionId: string;
  now: string;
}) {
  const session = await input.repository.findActiveSession({
    sessionId: input.sessionId,
    now: input.now,
  });

  if (!session) {
    throw new TracePersistenceError("Session not found or expired", 404);
  }

  return session;
}

function buildRetrievalInserts(input: {
  queryId: string;
  sessionId: string;
  expiresAt: string;
  hardExpiresAt: string;
  rows: RagRetrievalRow[];
}): PersistTraceRetrievalInsert[] {
  return input.rows
    .filter((row) => isUuid(row.chunkId))
    .map((row) => ({
      query_id: input.queryId,
      chunk_id: row.chunkId,
      rank: row.rank,
      similarity: row.similarity,
      distance: normalizeDistance(row),
      selected: row.selected,
      session_id: input.sessionId,
      expires_at: input.expiresAt,
      hard_expires_at: input.hardExpiresAt,
    }));
}

function normalizeDistance(row: RagRetrievalRow) {
  if (typeof row.distance === "number" && Number.isFinite(row.distance)) {
    return row.distance;
  }

  return Math.max(0, 1 - row.similarity);
}

function buildCitations(rows: RagRetrievalRow[]): RagCitation[] {
  return rows.map((row) => ({
    rank: row.rank,
    chunkId: row.chunkId,
    fileName: row.fileName,
    similarity: row.similarity,
  }));
}

function createAnswerPreview(answer: string) {
  const compact = answer.replace(/\s+/g, " ").trim();

  return compact.length > 140 ? `${compact.slice(0, 137)}...` : compact;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
