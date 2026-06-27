import { describe, expect, test } from "bun:test";

import {
  getExampleCorpusSlugs,
  listExampleCorpusManifests,
} from "./example-corpus-manifest";

describe("example corpus manifest", () => {
  test("lists only first-party, ready V1 example corpora", () => {
    const corpora = listExampleCorpusManifests();

    expect(corpora.map((corpus) => corpus.slug)).toEqual([
      "rag-concepts-primer",
      "claim-check-clinic",
      "two-hop-systems-brief",
    ]);
    expect(corpora.every((corpus) => corpus.sourceKind === "example")).toBe(
      true,
    );
    expect(corpora.every((corpus) => corpus.status === "ready")).toBe(true);
    expect(corpora.every((corpus) => corpus.documentCount > 0)).toBe(true);
    expect(corpora.every((corpus) => corpus.sourceName === "RAG Lens")).toBe(
      true,
    );
    expect(corpora.map((corpus) => corpus.title)).toEqual([
      "RAG Concepts Primer",
      "Claim Check Clinic",
      "Two-Hop Systems Brief",
    ]);
  });

  test("exposes seedable slugs in manifest order", () => {
    expect(getExampleCorpusSlugs()).toEqual([
      "rag-concepts-primer",
      "claim-check-clinic",
      "two-hop-systems-brief",
    ]);
  });
});
