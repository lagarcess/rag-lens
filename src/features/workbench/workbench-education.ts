import type { WorkbenchSource } from "./workbench-state";

const GUIDED_PROMPTS_BY_SOURCE: Record<string, string[]> = {
  "rag-concepts-primer": [
    "How does RAG improve answer trust?",
    "What does the retriever send to the answer model?",
  ],
  "claim-check-clinic": [
    "Which claims are supported by the clinic notes?",
    "What evidence would make a claim less trustworthy?",
  ],
  "two-hop-systems-brief": [
    "Why does this question need evidence from more than one chunk?",
    "How do the system notes connect retrieval and latency?",
  ],
};

export const RAG_CONCEPT_HELP = {
  citations:
    "Citations point back to the retrieved chunk that supports a part of the answer.",
  cosineSimilarity:
    "Cosine similarity measures how close two vectors are. Higher scores mean the question and chunk are more similar.",
  promptAssembly:
    "Prompt assembly combines the user question with selected document evidence before the answer model writes a response.",
  promptLength:
    "Prompt length is the amount of text sent to the answer model. Longer prompts can include more context, but may add noise.",
  uploadLocked:
    "Uploaded files are already chunked and embedded. Changing chunk length, overlap, or embedding mode requires re-indexing the file.",
} as const;

export function getGuidedPromptOptions(
  source: Pick<WorkbenchSource, "slug" | "sourceKind"> | undefined,
) {
  if (!source || source.sourceKind !== "example") {
    return [];
  }

  return GUIDED_PROMPTS_BY_SOURCE[source.slug] ?? [];
}
