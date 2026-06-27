import { describe, expect, test } from "bun:test";

import { retrieveSupabaseVector } from "./supabase-vector";

describe("retrieveSupabaseVector", () => {
  test("embeds a question, calls match_rag_chunks, and maps rows into trace retrieval rows", async () => {
    const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const supabase = {
      rpc: (name: string, args: Record<string, unknown>) => {
        rpcCalls.push({ name, args });

        return Promise.resolve({
          data: [
            {
              chunk_id: "chunk-1",
              document_id: "doc-1",
              file_name: "rag-primer.md",
              content: "RAG grounds answers in retrieved context.",
              chunk_index: 2,
              char_start: 20,
              char_end: 62,
              embedding_model: "pplx-embed-v1-0.6b",
              embedding_mode: "standard",
              similarity: 0.91,
              distance: 0.09,
              metadata: {
                matchedTerms: ["rag", "answers"],
              },
            },
          ],
          error: null,
        });
      },
    };

    const result = await retrieveSupabaseVector({
      question: "How does RAG improve answers?",
      corpusSlug: "rag-concepts-primer",
      topK: 5,
      queryEmbeddingModel: "pplx-embed-v1-0.6b",
      queryEmbedding: async () => [0.6, 0.8],
      supabase,
    });

    expect(result.method).toBe("supabase-pgvector-cosine");
    expect(result.queryEmbeddingModel).toBe("pplx-embed-v1-0.6b");
    expect(result.documentEmbeddingModel).toBe("pplx-embed-v1-0.6b");
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0]).toMatchObject({
      name: "match_rag_chunks",
      args: {
        filter_corpus_slug: "rag-concepts-primer",
        filter_session_id: null,
        match_count: 5,
        match_threshold: 0,
        query_embedding: "[0.6,0.8]",
      },
    });
    expect(result.rows[0]).toMatchObject({
      chunkId: "chunk-1",
      documentId: "doc-1",
      fileName: "rag-primer.md",
      chunkIndex: 2,
      charStart: 20,
      charEnd: 62,
      rank: 1,
      similarity: 0.91,
      selected: true,
      retrievalMode: "vector",
      matchedTerms: ["rag", "answers"],
      embeddingModel: "pplx-embed-v1-0.6b",
      embeddingMode: "standard",
    });
  });

  test("filters vector retrieval by active upload session when session scope is provided", async () => {
    const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const supabase = {
      rpc: (name: string, args: Record<string, unknown>) => {
        rpcCalls.push({ name, args });

        return Promise.resolve({
          data: [],
          error: null,
        });
      },
    };

    await retrieveSupabaseVector({
      question: "What did I upload?",
      sessionId: "11111111-1111-4111-8111-111111111111",
      topK: 3,
      queryEmbeddingModel: "pplx-embed-v1-0.6b",
      queryEmbedding: async () => [0.6, 0.8],
      supabase,
    });

    expect(rpcCalls[0]).toMatchObject({
      name: "match_rag_chunks",
      args: {
        filter_session_id: "11111111-1111-4111-8111-111111111111",
        filter_corpus_slug: null,
        match_count: 3,
        match_threshold: 0,
      },
    });
  });
});
