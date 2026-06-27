import type { RagRetrievalRow } from "./trace";

interface AssemblePromptInput {
  question: string;
  retrievalRows: RagRetrievalRow[];
}

interface AssemblePromptResult {
  rendered: string;
  contextChunkIds: string[];
}

export function assemblePrompt(input: AssemblePromptInput): AssemblePromptResult {
  const context = input.retrievalRows
    .map(
      (row) =>
        `[${row.rank}] ${row.fileName}#chunk-${row.chunkIndex}\n${row.content}`,
    )
    .join("\n\n");

  return {
    rendered: [
      "Answer the question using only the retrieved context.",
      "If the context is insufficient, say that the context is insufficient.",
      "",
      `Question: ${input.question}`,
      "",
      "Retrieved context:",
      context || "No context retrieved.",
    ].join("\n"),
    contextChunkIds: input.retrievalRows.map((row) => row.chunkId),
  };
}

export function buildLocalAnswer(retrievalRows: RagRetrievalRow[]): string {
  if (retrievalRows.length === 0 || retrievalRows[0].similarity === 0) {
    return "The retrieved context is insufficient to answer this question.";
  }

  const citedRanks = retrievalRows.map((row) => `[${row.rank}]`).join(", ");

  return [
    "Based on the retrieved context, RAG improves answer trust by grounding a response in source passages before the answer is produced.",
    "The trace shows which chunks were selected, how they ranked, and which citations support the final response.",
    `Relevant retrieved context: ${citedRanks}.`,
  ].join(" ");
}
