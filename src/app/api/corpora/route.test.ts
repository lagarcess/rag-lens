import { describe, expect, test } from "bun:test";

import { GET } from "./route";

describe("GET /api/corpora", () => {
  test("returns the active first-party example source catalog", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sources: [
        expect.objectContaining({
          slug: "rag-concepts-primer",
          title: "RAG Concepts Primer",
          description: "Small first-party explainer corpus",
          sourceKind: "example",
          sourceName: "RAG Lens",
          status: "ready",
          documentCount: 1,
        }),
        expect.objectContaining({
          slug: "claim-check-clinic",
          title: "Claim Check Clinic",
          sourceKind: "example",
          sourceName: "RAG Lens",
          status: "ready",
          documentCount: 1,
        }),
        expect.objectContaining({
          slug: "two-hop-systems-brief",
          title: "Two-Hop Systems Brief",
          sourceKind: "example",
          sourceName: "RAG Lens",
          status: "ready",
          documentCount: 1,
        }),
      ],
    });
  });
});
