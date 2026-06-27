import { describe, expect, test } from "bun:test";

import { POST } from "./route";

describe("POST /api/query", () => {
  test("returns a local example trace response", async () => {
    const previousChatProvider = process.env.CHAT_PROVIDER;
    process.env.CHAT_PROVIDER = "local";

    try {
      const response = await POST(
        new Request("http://localhost:3000/api/query", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sessionId: null,
            corpusSlug: "rag-concepts-primer",
            question: "How does RAG improve answer trust?",
            topK: 3,
            chunkSize: 520,
            chunkOverlap: 80,
            embeddingMode: "standard",
          }),
        }),
      );

      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.answer).toContain("retrieved context");
      expect(json.trace.retrieval.method).toBe(
        "deterministic-lexical-overlap",
      );
      expect(json.trace.persistence.mode).toBe("ephemeral");
    } finally {
      process.env.CHAT_PROVIDER = previousChatProvider;
    }
  });
});
