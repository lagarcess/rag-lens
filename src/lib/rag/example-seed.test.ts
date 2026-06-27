import { describe, expect, test } from "bun:test";

import { buildExampleChunkInsertRows } from "./example-seed";
import type { RagChunk } from "./trace";

describe("buildExampleChunkInsertRows", () => {
  test("creates non-expiring example chunk rows with pgvector embeddings", () => {
    const chunks: RagChunk[] = [
      {
        chunkId: "local:0",
        documentId: "local",
        fileName: "rag-primer.md",
        chunkIndex: 0,
        charStart: 5,
        charEnd: 42,
        content: "RAG grounds answers in retrieved context.",
      },
    ];

    const rows = buildExampleChunkInsertRows({
      documentId: "doc-uuid",
      corpusSlug: "rag-concepts-primer",
      chunks,
      embeddings: [[0.6, 0.8]],
      embeddingModel: "pplx-embed-v1-0.6b",
      embeddingMode: "standard",
    });

    expect(rows).toEqual([
      {
        document_id: "doc-uuid",
        session_id: null,
        corpus_slug: "rag-concepts-primer",
        chunk_index: 0,
        content: "RAG grounds answers in retrieved context.",
        char_start: 5,
        char_end: 42,
        embedding_model: "pplx-embed-v1-0.6b",
        embedding_mode: "standard",
        embedding: "[0.6,0.8]",
        metadata: {
          charStart: 5,
          charEnd: 42,
          localChunkId: "local:0",
        },
        expires_at: null,
        hard_expires_at: null,
      },
    ]);
  });
});
