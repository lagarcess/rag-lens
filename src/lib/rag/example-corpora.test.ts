import { describe, expect, test } from "bun:test";

import { getExampleCorpusSlugs } from "./example-corpus-manifest";
import { loadExampleCorpus } from "./example-corpora";

describe("loadExampleCorpus", () => {
  test("loads every bundled first-party example corpus", async () => {
    for (const slug of getExampleCorpusSlugs()) {
      const corpus = await loadExampleCorpus(slug);

      expect(corpus.slug).toBe(slug);
      expect(corpus.title).toBeTruthy();
      expect(corpus.documents.length).toBeGreaterThan(0);
      expect(corpus.documents[0].content.length).toBeGreaterThan(300);
      expect(corpus.documents[0].fileName.endsWith(".md")).toBe(true);
    }
  });

  test("rejects unknown example corpus slugs", async () => {
    await expect(loadExampleCorpus("unknown-corpus")).rejects.toThrow(
      "Unknown example corpus: unknown-corpus",
    );
  });
});
