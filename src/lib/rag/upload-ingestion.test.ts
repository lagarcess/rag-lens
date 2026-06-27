import { describe, expect, test } from "bun:test";

import {
  buildUploadChunkInsertRows,
  ingestUploadedDocument,
} from "./upload-ingestion";
import type { RagChunk } from "./trace";

const uploadedDocument = {
  documentId: "33333333-3333-4333-8333-333333333333",
  sessionId: "11111111-1111-4111-8111-111111111111",
  fileName: "notes.md",
  extractedText: "Alpha beta gamma delta epsilon zeta.",
  expiresAt: "2026-06-27T12:00:00.000Z",
  hardExpiresAt: "2026-06-28T10:00:00.000Z",
};

describe("buildUploadChunkInsertRows", () => {
  test("creates session-scoped upload chunk rows with retention fields", () => {
    const chunks: RagChunk[] = [
      {
        chunkId: `${uploadedDocument.documentId}:0`,
        documentId: uploadedDocument.documentId,
        fileName: uploadedDocument.fileName,
        chunkIndex: 0,
        charStart: 0,
        charEnd: 16,
        content: "Alpha beta gamma",
      },
    ];

    const rows = buildUploadChunkInsertRows({
      documentId: uploadedDocument.documentId,
      sessionId: uploadedDocument.sessionId,
      chunks,
      embeddings: [[0.6, 0.8]],
      embeddingModel: "pplx-embed-v1-0.6b",
      embeddingMode: "standard",
      expiresAt: uploadedDocument.expiresAt,
      hardExpiresAt: uploadedDocument.hardExpiresAt,
    });

    expect(rows).toEqual([
      {
        document_id: uploadedDocument.documentId,
        session_id: uploadedDocument.sessionId,
        corpus_slug: null,
        chunk_index: 0,
        content: "Alpha beta gamma",
        char_start: 0,
        char_end: 16,
        embedding_model: "pplx-embed-v1-0.6b",
        embedding_mode: "standard",
        embedding: "[0.6,0.8]",
        metadata: {
          charStart: 0,
          charEnd: 16,
          localChunkId: `${uploadedDocument.documentId}:0`,
        },
        expires_at: uploadedDocument.expiresAt,
        hard_expires_at: uploadedDocument.hardExpiresAt,
      },
    ]);
  });

  test("rejects mismatched chunk and embedding counts", () => {
    expect(() =>
      buildUploadChunkInsertRows({
        documentId: uploadedDocument.documentId,
        sessionId: uploadedDocument.sessionId,
        chunks: [],
        embeddings: [[0.6, 0.8]],
        embeddingModel: "pplx-embed-v1-0.6b",
        embeddingMode: "standard",
        expiresAt: uploadedDocument.expiresAt,
        hardExpiresAt: uploadedDocument.hardExpiresAt,
      }),
    ).toThrow("Chunk count must match embedding count");
  });
});

describe("ingestUploadedDocument", () => {
  test("chunks, embeds, and persists an uploaded document for session retrieval", async () => {
    const insertedRows: Array<Record<string, unknown>> = [];
    const embedInputs: string[][] = [];

    const result = await ingestUploadedDocument({
      document: uploadedDocument,
      embeddingModel: "pplx-embed-v1-0.6b",
      chunkSize: 12,
      chunkOverlap: 2,
      embedTexts: async (texts) => {
        embedInputs.push(texts);
        return texts.map(() => [0.6, 0.8]);
      },
      repository: {
        async replaceDocumentChunks({ rows }) {
          insertedRows.push(...rows);
          return rows.length;
        },
      },
    });

    expect(embedInputs).toHaveLength(1);
    expect(embedInputs[0]).toEqual([
      "Alpha beta g",
      " gamma delta",
      "ta epsilon z",
      " zeta.",
    ]);
    expect(result).toEqual({
      documentId: uploadedDocument.documentId,
      insertedChunks: 4,
      embeddingModel: "pplx-embed-v1-0.6b",
      embeddingMode: "standard",
    });
    expect(insertedRows).toHaveLength(4);
    expect(insertedRows[0]).toMatchObject({
      document_id: uploadedDocument.documentId,
      session_id: uploadedDocument.sessionId,
      corpus_slug: null,
      chunk_index: 0,
      expires_at: uploadedDocument.expiresAt,
      hard_expires_at: uploadedDocument.hardExpiresAt,
    });
  });
});
