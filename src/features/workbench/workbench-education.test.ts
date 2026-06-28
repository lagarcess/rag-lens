import { describe, expect, test } from "bun:test";

import {
  RAG_CONCEPT_HELP,
  getGuidedPromptOptions,
} from "./workbench-education";

describe("getGuidedPromptOptions", () => {
  test("returns focused starter prompts for each first-party example corpus", () => {
    expect(
      getGuidedPromptOptions({
        slug: "rag-concepts-primer",
        sourceKind: "example",
      }),
    ).toEqual([
      "How does RAG improve answer trust?",
      "What does the retriever send to the answer model?",
    ]);
    expect(
      getGuidedPromptOptions({
        slug: "claim-check-clinic",
        sourceKind: "example",
      }),
    ).toEqual([
      "Which claims are supported by the clinic notes?",
      "What evidence would make a claim less trustworthy?",
    ]);
    expect(
      getGuidedPromptOptions({
        slug: "two-hop-systems-brief",
        sourceKind: "example",
      }),
    ).toEqual([
      "Why does this question need evidence from more than one chunk?",
      "How do the system notes connect retrieval and latency?",
    ]);
  });

  test("does not show guided example prompts for uploads or unknown sources", () => {
    expect(
      getGuidedPromptOptions({
        slug: "session-uploads",
        sourceKind: "upload",
      }),
    ).toEqual([]);
    expect(
      getGuidedPromptOptions({
        slug: "unknown",
        sourceKind: "example",
      }),
    ).toEqual([]);
    expect(getGuidedPromptOptions(undefined)).toEqual([]);
  });
});

describe("RAG_CONCEPT_HELP", () => {
  test("defines concise help for the beginner terms surfaced in the workbench", () => {
    expect(RAG_CONCEPT_HELP.cosineSimilarity).toContain("similar");
    expect(RAG_CONCEPT_HELP.promptAssembly).toContain("question");
    expect(RAG_CONCEPT_HELP.citations).toContain("chunk");
    expect(RAG_CONCEPT_HELP.uploadLocked).toContain("re-indexing");
  });
});
