export type EmbeddingMode = "standard" | "contextualized";

export type RetrievalMethod =
  | "deterministic-lexical-overlap"
  | "supabase-pgvector-cosine";

export interface RagQueryRequest {
  sessionId: string | null;
  corpusSlug: string;
  question: string;
  topK: number;
  chunkSize: number;
  chunkOverlap: number;
  embeddingMode: EmbeddingMode;
}

export interface RagChunk {
  chunkId: string;
  documentId: string;
  fileName: string;
  chunkIndex: number;
  charStart: number;
  charEnd: number;
  content: string;
}

export interface RagRetrievalRow extends RagChunk {
  rank: number;
  similarity: number;
  distance?: number;
  selected: boolean;
  retrievalMode: "lexical" | "vector";
  matchedTerms: string[];
  embeddingModel?: string;
  embeddingMode?: EmbeddingMode;
}

export interface RagCitation {
  rank: number;
  chunkId: string;
  fileName: string;
  similarity: number;
}

export interface RagTrace {
  settings: {
    topK: number;
    chunkSize: number;
    chunkOverlap: number;
    embeddingMode: EmbeddingMode;
  };
  corpus: {
    slug: string;
    title: string;
    sourceKind: "example" | "upload";
    documentCount: number;
  };
  extraction: {
    documents: Array<{
      documentId: string;
      fileName: string;
      characterCount: number;
    }>;
  };
  chunking: {
    totalChunks: number;
    chunks: RagChunk[];
  };
  retrieval: {
    method: RetrievalMethod;
    rows: RagRetrievalRow[];
  };
  prompt: {
    rendered: string;
    contextChunkIds: string[];
  };
  models: {
    embedding: {
      provider: "none" | "perplexity";
      model: string;
      queryModel?: string;
      documentModel?: string;
    };
    answer: {
      provider: "local" | "openrouter";
      model: string;
      finishReason?: string;
      usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };
    };
  };
  timingsMs: {
    total: number;
    retrieval: number;
    generation: number;
  };
  persistence: {
    mode: "ephemeral" | "session";
    store:
      | "local-example-runner"
      | "supabase-session-vectors"
      | "supabase-trace-history";
  };
  warnings: string[];
}

export interface RagTraceResponse {
  queryId: string;
  answer: string;
  citations: RagCitation[];
  trace: RagTrace;
}
