import { describe, expect, test } from "bun:test";

import { retrieveLexical } from "./retrieve";
import type { RagChunk } from "./trace";

const chunks: RagChunk[] = [
  {
    chunkId: "doc:0",
    documentId: "doc",
    fileName: "rag-primer.md",
    chunkIndex: 0,
    charStart: 0,
    charEnd: 68,
    content: "Embeddings turn text into vectors so related ideas sit near each other.",
  },
  {
    chunkId: "doc:1",
    documentId: "doc",
    fileName: "rag-primer.md",
    chunkIndex: 1,
    charStart: 69,
    charEnd: 158,
    content:
      "RAG improves answer trust by retrieving source context and attaching citations to the answer.",
  },
  {
    chunkId: "doc:2",
    documentId: "doc",
    fileName: "rag-primer.md",
    chunkIndex: 2,
    charStart: 159,
    charEnd: 228,
    content: "Chunk overlap helps preserve continuity across passage boundaries.",
  },
];

describe("retrieveLexical", () => {
  test("ranks chunks by question term overlap and labels method honestly", () => {
    const result = retrieveLexical({
      question: "How does RAG improve answer trust with citations?",
      chunks,
      topK: 2,
    });

    expect(result.method).toBe("deterministic-lexical-overlap");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      chunkId: "doc:1",
      rank: 1,
      selected: true,
      retrievalMode: "lexical",
    });
    expect(result.rows[0].similarity).toBeGreaterThan(result.rows[1].similarity);
  });
});
