import { describe, expect, test } from "bun:test";

import { chunkText } from "./chunk";

describe("chunkText", () => {
  test("creates deterministic chunks with source offsets and overlap", () => {
    const content = [
      "Retrieval augmented generation improves answer trust by grounding model output in source material.",
      "Chunking keeps source passages small enough to rank and inspect.",
      "Citations let a reader verify whether the answer actually used the retrieved context.",
    ].join("\n\n");

    const chunks = chunkText(
      {
        documentId: "doc_rag_primer",
        fileName: "rag-primer.md",
        content,
      },
      {
        chunkSize: 120,
        chunkOverlap: 24,
      },
    );

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toMatchObject({
      chunkId: "doc_rag_primer:0",
      chunkIndex: 0,
      documentId: "doc_rag_primer",
      fileName: "rag-primer.md",
      charStart: 0,
    });

    for (const chunk of chunks) {
      expect(content.slice(chunk.charStart, chunk.charEnd)).toBe(chunk.content);
      expect(chunk.charEnd).toBeGreaterThan(chunk.charStart);
    }

    expect(chunks[1].charStart).toBeLessThan(chunks[0].charEnd);
  });
});
