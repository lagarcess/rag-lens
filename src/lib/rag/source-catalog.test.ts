import { describe, expect, test } from "bun:test";

import { listExampleSourceCatalogItems } from "./source-catalog";

describe("listExampleSourceCatalogItems", () => {
  test("maps bundled corpora to public catalog metadata", () => {
    const sources = listExampleSourceCatalogItems();

    expect(sources).toHaveLength(3);
    expect(
      sources.map((source) => ({
        slug: source.slug,
        sourceKind: source.sourceKind,
        sourceName: source.sourceName,
        status: source.status,
        documentCount: source.documentCount,
      })),
    ).toEqual([
      {
        slug: "rag-concepts-primer",
        sourceKind: "example",
        sourceName: "RAG Lens",
        status: "ready",
        documentCount: 1,
      },
      {
        slug: "claim-check-clinic",
        sourceKind: "example",
        sourceName: "RAG Lens",
        status: "ready",
        documentCount: 1,
      },
      {
        slug: "two-hop-systems-brief",
        sourceKind: "example",
        sourceName: "RAG Lens",
        status: "ready",
        documentCount: 1,
      },
    ]);
  });
});
