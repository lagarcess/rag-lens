import { toPgVector } from "@/lib/embeddings";
import type { RagRetrievalRow, RetrievalMethod } from "./trace";

interface SupabaseRpcClient {
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): PromiseLike<{
    data: SupabaseMatchRow[] | null;
    error: { message: string } | null;
  }>;
}

interface RetrieveSupabaseVectorInput {
  question: string;
  corpusSlug?: string;
  sessionId?: string;
  topK: number;
  queryEmbeddingModel: string;
  queryEmbedding: (question: string) => Promise<number[]>;
  supabase: SupabaseRpcClient;
}

interface SupabaseVectorRetrieval {
  method: RetrievalMethod;
  rows: RagRetrievalRow[];
  queryEmbeddingModel: string;
  documentEmbeddingModel?: string;
}

export async function retrieveSupabaseVector(
  input: RetrieveSupabaseVectorInput,
): Promise<SupabaseVectorRetrieval> {
  if (!input.sessionId && !input.corpusSlug) {
    throw new Error("Vector retrieval requires a corpus or session scope");
  }

  const embedding = await input.queryEmbedding(input.question);
  const { data, error } = await input.supabase.rpc("match_rag_chunks", {
    query_embedding: toPgVector(embedding),
    match_count: input.topK,
    match_threshold: 0,
    filter_session_id: input.sessionId ?? null,
    filter_corpus_slug: input.sessionId ? null : input.corpusSlug,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    method: "supabase-pgvector-cosine",
    queryEmbeddingModel: input.queryEmbeddingModel,
    documentEmbeddingModel: data?.[0]?.embedding_model,
    rows: (data ?? []).map((row, index) => ({
      chunkId: row.chunk_id,
      documentId: row.document_id,
      fileName: row.file_name,
      chunkIndex: row.chunk_index,
      charStart: row.char_start,
      charEnd: row.char_end,
      content: row.content,
      rank: index + 1,
      similarity: row.similarity,
      selected: true,
      retrievalMode: "vector",
      matchedTerms: Array.isArray(row.metadata?.matchedTerms)
        ? row.metadata.matchedTerms.map(String)
        : [],
      embeddingModel: row.embedding_model,
      embeddingMode:
        row.embedding_mode === "contextualized" ? "contextualized" : "standard",
    })),
  };
}

interface SupabaseMatchRow {
  chunk_id: string;
  document_id: string;
  file_name: string;
  content: string;
  chunk_index: number;
  char_start: number;
  char_end: number;
  embedding_model: string;
  embedding_mode: string;
  similarity: number;
  distance: number;
  metadata?: {
    charStart?: number;
    charEnd?: number;
    matchedTerms?: unknown[];
  } | null;
}
