import type { RagChunk, RagRetrievalRow, RetrievalMethod } from "./trace";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "by",
  "does",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

interface RetrieveLexicalInput {
  question: string;
  chunks: RagChunk[];
  topK: number;
}

interface RetrieveLexicalResult {
  method: RetrievalMethod;
  rows: RagRetrievalRow[];
}

export function retrieveLexical(
  input: RetrieveLexicalInput,
): RetrieveLexicalResult {
  const queryTerms = tokenize(input.question);

  const rows = input.chunks
    .map((chunk) => {
      const chunkTerms = new Set(tokenize(chunk.content));
      const matchedTerms = queryTerms.filter((term) => chunkTerms.has(term));
      const similarity =
        queryTerms.length === 0 ? 0 : matchedTerms.length / queryTerms.length;

      return {
        ...chunk,
        rank: 0,
        similarity: Number(similarity.toFixed(4)),
        selected: true,
        retrievalMode: "lexical" as const,
        matchedTerms,
      };
    })
    .sort((left, right) => {
      if (right.similarity !== left.similarity) {
        return right.similarity - left.similarity;
      }

      return left.chunkIndex - right.chunkIndex;
    })
    .slice(0, Math.max(0, input.topK))
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

  return {
    method: "deterministic-lexical-overlap",
    rows,
  };
}

function tokenize(value: string): string[] {
  const terms = value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));

  return Array.from(new Set(terms));
}
