import type { RagCitation, RagTraceResponse } from "@/lib/rag/trace";

const STRONG_SCORE_THRESHOLD = 0.75;
const USABLE_SCORE_THRESHOLD = 0.45;

type EvidenceTone = "strong" | "usable" | "weak" | "none";
type ScoreLabel = "strong" | "usable" | "weak" | "no score";

interface TraceStageEvidence {
  label: string;
  meaning: string;
  value: string;
  detail: string;
  whatThisMeans: string;
}

interface RetrievalVerdict {
  label: "strong evidence" | "usable evidence" | "weak evidence" | "no evidence";
  tone: EvidenceTone;
  detail: string;
  topSimilarity: number | null;
  topSimilarityPercent: number | null;
  retrievedCount: number;
}

export interface TraceEvidence {
  summary: string;
  retrievalVerdict: RetrievalVerdict;
  stages: TraceStageEvidence[];
  timingRows: Array<[string, string]>;
  modelRows: Array<[string, string]>;
  warnings: string[];
}

export interface SelectedContextRow {
  chunkId: string;
  rank: number | null;
  fileName: string;
  similarity: number | null;
}

export interface TraceChunkRow {
  chunkId: string;
  fileName: string;
  chunkIndex: number;
  charStart: number;
  charEnd: number;
  preview: string;
  rank: number | null;
  similarity: number | null;
  selected: boolean;
  retrieved: boolean;
  scorePercent: number | null;
  scoreBarValue: number;
  scoreLabel: ScoreLabel;
  scoreDescription: string;
  stateLabel: "sent to prompt" | "found, not sent" | "not retrieved";
  stateDescription: string;
}

export interface AnswerCitationView {
  label: string;
  detail: string;
}

export function buildTraceEvidence(result: RagTraceResponse): TraceEvidence {
  const trace = result.trace;
  const retrievalVerdict = buildRetrievalVerdict(result);
  const extractionDetail = trace.extraction.documents
    .map(
      (document) =>
        `${document.fileName} · ${formatNumber(document.characterCount)} chars`,
    )
    .join(", ");
  const selectedCount = trace.retrieval.rows.filter((row) => row.selected).length;

  return {
    summary: formatRunSummary(
      trace.retrieval.rows.length,
      trace.prompt.contextChunkIds.length,
    ),
    retrievalVerdict,
    stages: [
      {
        label: "Read documents",
        meaning: "Document reading",
        value: formatUnit(trace.extraction.documents.length, "doc"),
        detail: extractionDetail || "No documents extracted",
        whatThisMeans:
          "The app read the available files and counted how much searchable text they contain.",
      },
      {
        label: "Split into chunks",
        meaning: "Chunking",
        value: formatUnit(trace.chunking.totalChunks, "chunk"),
        detail: `${formatNumber(
          trace.settings.chunkSize,
        )} characters each · ${formatNumber(trace.settings.chunkOverlap)} overlap`,
        whatThisMeans:
          "The document text was split into smaller passages so each passage can be checked against the question.",
      },
      {
        label: "Compared meaning",
        meaning: "Semantic comparison",
        value: trace.models.embedding.provider,
        detail: formatEmbeddingDetail(result),
        whatThisMeans:
          "The question and document chunks were turned into comparable meaning signals before search.",
      },
      {
        label: "Found evidence",
        meaning: "Retrieval",
        value: formatUnit(trace.retrieval.rows.length, "match", "matches"),
        detail: `${formatUnit(trace.retrieval.rows.length, "row")} · ${formatUnit(
          selectedCount,
          "sent to prompt",
          "sent to prompt",
        )} · ${trace.retrieval.method}`,
        whatThisMeans:
          "The app ranked chunks by how closely they matched the question and chose which evidence to send forward.",
      },
      {
        label: "Built prompt",
        meaning: "Prompt assembly",
        value: `${formatNumber(trace.prompt.rendered.length)} chars`,
        detail: formatUnit(trace.prompt.contextChunkIds.length, "context chunk"),
        whatThisMeans:
          "Only the selected evidence was placed beside the question for the answer writer.",
      },
      {
        label: "Generated answer",
        meaning: "Answer generation",
        value: trace.models.answer.provider,
        detail: [
          trace.models.answer.model,
          trace.models.answer.finishReason,
        ]
          .filter(Boolean)
          .join(" · "),
        whatThisMeans:
          "The answer writer used the provided evidence and question to produce the final response.",
      },
    ],
    timingRows: [
      ["full run", `${formatNumber(trace.timingsMs.total)} ms`],
      ["finding evidence", `${formatNumber(trace.timingsMs.retrieval)} ms`],
      ["writing answer", `${formatNumber(trace.timingsMs.generation)} ms`],
    ],
    modelRows: buildModelRows(result),
    warnings: buildBeginnerWarnings(result, retrievalVerdict),
  };
}

export function buildSelectedContextRows(
  result: RagTraceResponse,
): SelectedContextRow[] {
  const rowsById = new Map(
    result.trace.retrieval.rows.map((row) => [row.chunkId, row]),
  );

  return result.trace.prompt.contextChunkIds.map((chunkId) => {
    const row = rowsById.get(chunkId);

    return {
      chunkId,
      rank: row?.rank ?? null,
      fileName: row?.fileName ?? "unknown source",
      similarity: row?.similarity ?? null,
    };
  });
}

export function buildTraceChunkRows(result: RagTraceResponse): TraceChunkRow[] {
  const retrievalRowsById = new Map(
    result.trace.retrieval.rows.map((row) => [row.chunkId, row]),
  );

  return result.trace.chunking.chunks.map((chunk) => {
    const retrievalRow = retrievalRowsById.get(chunk.chunkId);
    const score = buildScoreMetadata(retrievalRow?.similarity ?? null);
    const state = buildChunkStateCopy(
      retrievalRow?.selected ?? false,
      Boolean(retrievalRow),
    );

    return {
      chunkId: chunk.chunkId,
      fileName: chunk.fileName,
      chunkIndex: chunk.chunkIndex,
      charStart: chunk.charStart,
      charEnd: chunk.charEnd,
      preview: formatPreview(chunk.content),
      rank: retrievalRow?.rank ?? null,
      similarity: retrievalRow?.similarity ?? null,
      selected: retrievalRow?.selected ?? false,
      retrieved: Boolean(retrievalRow),
      ...score,
      ...state,
    };
  });
}

export function buildAnswerCitations(
  result: RagTraceResponse,
): AnswerCitationView[] {
  return result.citations.map(formatCitation);
}

function buildModelRows(result: RagTraceResponse): Array<[string, string]> {
  const trace = result.trace;
  const rows: Array<[string, string]> = [
    [
      "embedding model",
      `${trace.models.embedding.provider} / ${trace.models.embedding.model}`,
    ],
  ];

  if (trace.models.embedding.queryModel) {
    rows.push(["question vectors", trace.models.embedding.queryModel]);
  }

  if (trace.models.embedding.documentModel) {
    rows.push(["document vectors", trace.models.embedding.documentModel]);
  }

  rows.push([
    "chat model",
    `${trace.models.answer.provider} / ${trace.models.answer.model}`,
  ]);

  if (trace.models.answer.finishReason) {
    rows.push(["finish reason", trace.models.answer.finishReason]);
  }

  if (trace.models.answer.usage) {
    rows.push([
      "token use",
      `${formatNumber(trace.models.answer.usage.promptTokens)} in · ${formatNumber(
        trace.models.answer.usage.completionTokens,
      )} out · ${formatNumber(trace.models.answer.usage.totalTokens)} total`,
    ]);
  }

  rows.push(["stored as", `${trace.persistence.mode} / ${trace.persistence.store}`]);

  return rows;
}

function buildRetrievalVerdict(result: RagTraceResponse): RetrievalVerdict {
  const retrievedCount = result.trace.retrieval.rows.length;

  if (retrievedCount === 0) {
    return {
      label: "no evidence",
      tone: "none",
      detail: "No chunks were retrieved for this question.",
      topSimilarity: null,
      topSimilarityPercent: null,
      retrievedCount,
    };
  }

  const topSimilarity = Math.max(
    ...result.trace.retrieval.rows.map((row) => row.similarity),
  );
  const topSimilarityPercent = similarityToPercent(topSimilarity);

  if (topSimilarity >= STRONG_SCORE_THRESHOLD && retrievedCount >= 2) {
    return {
      label: "strong evidence",
      tone: "strong",
      detail:
        "The top match is high and the retriever found multiple chunks to compare.",
      topSimilarity,
      topSimilarityPercent,
      retrievedCount,
    };
  }

  if (topSimilarity >= USABLE_SCORE_THRESHOLD) {
    return {
      label: "usable evidence",
      tone: "usable",
      detail:
        "The app found evidence that may answer the question, but it is not a strong multi-chunk match.",
      topSimilarity,
      topSimilarityPercent,
      retrievedCount,
    };
  }

  return {
    label: "weak evidence",
    tone: "weak",
    detail:
      "The retrieved chunks are low-confidence matches; check the source text before trusting the answer.",
    topSimilarity,
    topSimilarityPercent,
    retrievedCount,
  };
}

function buildBeginnerWarnings(
  result: RagTraceResponse,
  verdict: RetrievalVerdict,
) {
  const warnings = result.trace.warnings.map(formatBeginnerWarning);

  if (verdict.tone === "weak") {
    warnings.push(
      "The best retrieved evidence is weak, so the answer may need a better question or better source text.",
    );
  }

  if (verdict.tone === "none") {
    warnings.push(
      "No matching evidence was retrieved, so the answer should say it cannot answer from these documents.",
    );
  }

  return Array.from(new Set(warnings));
}

function formatBeginnerWarning(warning: string) {
  const normalized = warning.toLowerCase();

  if (normalized.includes("similarity")) {
    return "Some retrieved evidence scored low, so check whether the answer is fully supported by the documents.";
  }

  return warning;
}

function buildScoreMetadata(similarity: number | null) {
  if (similarity === null) {
    return {
      scorePercent: null,
      scoreBarValue: 0,
      scoreLabel: "no score" as const,
      scoreDescription:
        "No retrieval score because this chunk was not returned for the question.",
    };
  }

  const scorePercent = similarityToPercent(similarity);

  return {
    scorePercent,
    scoreBarValue: scorePercent,
    scoreLabel: getScoreLabel(similarity),
    scoreDescription: `${scorePercent}% similarity to the question.`,
  };
}

function buildChunkStateCopy(selected: boolean, retrieved: boolean) {
  if (selected) {
    return {
      stateLabel: "sent to prompt" as const,
      stateDescription:
        "This chunk was included as evidence for the answer writer.",
    };
  }

  if (retrieved) {
    return {
      stateLabel: "found, not sent" as const,
      stateDescription:
        "This chunk matched the question, but it was not included in the prompt context.",
    };
  }

  return {
    stateLabel: "not retrieved" as const,
    stateDescription:
      "This chunk was indexed, but it was not one of the matches for this question.",
  };
}

function getScoreLabel(similarity: number): ScoreLabel {
  if (similarity >= STRONG_SCORE_THRESHOLD) {
    return "strong";
  }

  if (similarity >= USABLE_SCORE_THRESHOLD) {
    return "usable";
  }

  return "weak";
}

function formatEmbeddingDetail(result: RagTraceResponse) {
  const embedding = result.trace.models.embedding;
  const queryModel = embedding.queryModel ?? embedding.model;
  const documentModel = embedding.documentModel ?? embedding.model;

  return `query: ${queryModel} · docs: ${documentModel}`;
}

function formatCitation(citation: RagCitation): AnswerCitationView {
  return {
    label: `[${citation.rank}]`,
    detail: `${citation.fileName} · ${citation.chunkId} · match score ${citation.similarity.toFixed(
      3,
    )}`,
  };
}

function formatPreview(content: string) {
  const compact = content.replace(/\s+/g, " ").trim();
  const maxLength = 97;

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 3).trimEnd()}...`;
}

function formatRunSummary(retrievedCount: number, selectedCount: number) {
  if (retrievedCount === 0) {
    return "The app found no matching evidence, so nothing was sent to the answer writer.";
  }

  return `The app found ${formatEvidencePieces(
    retrievedCount,
  )} and gave ${formatEvidencePieces(selectedCount)} to the answer writer.`;
}

function formatEvidencePieces(value: number) {
  if (value === 0) {
    return "no pieces of evidence";
  }

  return `${formatNumber(value)} ${value === 1 ? "piece" : "pieces"} of evidence`;
}

function similarityToPercent(similarity: number) {
  return Math.round(Math.min(1, Math.max(0, similarity)) * 100);
}

function formatUnit(
  value: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${formatNumber(value)} ${value === 1 ? singular : plural}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
