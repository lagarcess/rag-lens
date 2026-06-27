import { toPgVector } from "@/lib/embeddings";
import { RAG_LIMITS } from "@/lib/rag-config";

import { chunkText } from "./chunk";
import type { EmbeddingMode, RagChunk } from "./trace";

export interface UploadedDocumentForIngestion {
  documentId: string;
  sessionId: string;
  fileName: string;
  extractedText: string;
  expiresAt: string;
  hardExpiresAt: string;
}

export interface UploadChunkInsertRow {
  document_id: string;
  session_id: string;
  corpus_slug: null;
  chunk_index: number;
  content: string;
  char_start: number;
  char_end: number;
  embedding_model: string;
  embedding_mode: EmbeddingMode;
  embedding: string;
  metadata: {
    charStart: number;
    charEnd: number;
    localChunkId: string;
  };
  expires_at: string;
  hard_expires_at: string;
}

export interface UploadIngestionRepository {
  replaceDocumentChunks(input: {
    documentId: string;
    rows: UploadChunkInsertRow[];
  }): Promise<number>;
}

export interface IngestUploadedDocumentInput {
  document: UploadedDocumentForIngestion;
  repository: UploadIngestionRepository;
  embeddingModel: string;
  embeddingMode?: EmbeddingMode;
  chunkSize?: number;
  chunkOverlap?: number;
  embedTexts: (texts: string[]) => Promise<number[][]>;
}

export function buildUploadChunkInsertRows(input: {
  documentId: string;
  sessionId: string;
  chunks: RagChunk[];
  embeddings: number[][];
  embeddingModel: string;
  embeddingMode: EmbeddingMode;
  expiresAt: string;
  hardExpiresAt: string;
}): UploadChunkInsertRow[] {
  if (input.chunks.length !== input.embeddings.length) {
    throw new Error("Chunk count must match embedding count");
  }

  return input.chunks.map((chunk, index) => ({
    document_id: input.documentId,
    session_id: input.sessionId,
    corpus_slug: null,
    chunk_index: chunk.chunkIndex,
    content: chunk.content,
    char_start: chunk.charStart,
    char_end: chunk.charEnd,
    embedding_model: input.embeddingModel,
    embedding_mode: input.embeddingMode,
    embedding: toPgVector(input.embeddings[index]),
    metadata: {
      charStart: chunk.charStart,
      charEnd: chunk.charEnd,
      localChunkId: chunk.chunkId,
    },
    expires_at: input.expiresAt,
    hard_expires_at: input.hardExpiresAt,
  }));
}

export async function ingestUploadedDocument(input: IngestUploadedDocumentInput) {
  const embeddingMode = input.embeddingMode ?? "standard";
  const chunks = chunkText(
    {
      documentId: input.document.documentId,
      fileName: input.document.fileName,
      content: input.document.extractedText,
    },
    {
      chunkSize: input.chunkSize ?? RAG_LIMITS.defaultChunkSize,
      chunkOverlap: input.chunkOverlap ?? RAG_LIMITS.defaultChunkOverlap,
    },
  );
  const embeddings = await input.embedTexts(chunks.map((chunk) => chunk.content));
  const rows = buildUploadChunkInsertRows({
    documentId: input.document.documentId,
    sessionId: input.document.sessionId,
    chunks,
    embeddings,
    embeddingModel: input.embeddingModel,
    embeddingMode,
    expiresAt: input.document.expiresAt,
    hardExpiresAt: input.document.hardExpiresAt,
  });
  const insertedChunks = await input.repository.replaceDocumentChunks({
    documentId: input.document.documentId,
    rows,
  });

  return {
    documentId: input.document.documentId,
    insertedChunks,
    embeddingModel: input.embeddingModel,
    embeddingMode,
  };
}
