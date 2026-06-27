import type { RagCitation, RagTraceResponse } from "@/lib/rag/trace";

export interface TraceEvidence {
  stages: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
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

export interface AnswerCitationView {
  label: string;
  detail: string;
}

export function buildTraceEvidence(result: RagTraceResponse): TraceEvidence {
  const trace = result.trace;
  const extractionDetail = trace.extraction.documents
    .map(
      (document) =>
        `${document.fileName} · ${formatNumber(document.characterCount)} chars`,
    )
    .join(", ");
  const selectedCount = trace.retrieval.rows.filter((row) => row.selected).length;

  return {
    stages: [
      {
        label: "extraction",
        value: formatUnit(trace.extraction.documents.length, "doc"),
        detail: extractionDetail || "No documents extracted",
      },
      {
        label: "chunking",
        value: formatUnit(trace.chunking.totalChunks, "chunk"),
        detail: `${trace.settings.chunkSize} size · ${trace.settings.chunkOverlap} overlap`,
      },
      {
        label: "embedding",
        value: trace.models.embedding.provider,
        detail: formatEmbeddingDetail(result),
      },
      {
        label: "retrieval",
        value: trace.retrieval.method,
        detail: `${formatUnit(trace.retrieval.rows.length, "row")} · ${formatUnit(
          selectedCount,
          "selected",
          "selected",
        )}`,
      },
      {
        label: "prompt",
        value: `${formatNumber(trace.prompt.rendered.length)} chars`,
        detail: formatUnit(trace.prompt.contextChunkIds.length, "context chunk"),
      },
      {
        label: "answer",
        value: trace.models.answer.provider,
        detail: [
          trace.models.answer.model,
          trace.models.answer.finishReason,
        ]
          .filter(Boolean)
          .join(" · "),
      },
    ],
    timingRows: [
      ["total", `${formatNumber(trace.timingsMs.total)} ms`],
      ["retrieval", `${formatNumber(trace.timingsMs.retrieval)} ms`],
      ["generation", `${formatNumber(trace.timingsMs.generation)} ms`],
    ],
    modelRows: buildModelRows(result),
    warnings: [...trace.warnings],
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

export function buildAnswerCitations(
  result: RagTraceResponse,
): AnswerCitationView[] {
  return result.citations.map(formatCitation);
}

function buildModelRows(result: RagTraceResponse): Array<[string, string]> {
  const trace = result.trace;
  const rows: Array<[string, string]> = [
    [
      "embedding",
      `${trace.models.embedding.provider} / ${trace.models.embedding.model}`,
    ],
  ];

  if (trace.models.embedding.queryModel) {
    rows.push(["query model", trace.models.embedding.queryModel]);
  }

  if (trace.models.embedding.documentModel) {
    rows.push(["document model", trace.models.embedding.documentModel]);
  }

  rows.push([
    "answer",
    `${trace.models.answer.provider} / ${trace.models.answer.model}`,
  ]);

  if (trace.models.answer.finishReason) {
    rows.push(["finish", trace.models.answer.finishReason]);
  }

  if (trace.models.answer.usage) {
    rows.push([
      "tokens",
      `${formatNumber(trace.models.answer.usage.promptTokens)} in · ${formatNumber(
        trace.models.answer.usage.completionTokens,
      )} out · ${formatNumber(trace.models.answer.usage.totalTokens)} total`,
    ]);
  }

  rows.push(["persistence", `${trace.persistence.mode} / ${trace.persistence.store}`]);

  return rows;
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
    detail: `${citation.fileName} · ${citation.chunkId} · similarity ${citation.similarity.toFixed(
      3,
    )}`,
  };
}

function formatUnit(
  value: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${formatNumber(value)} ${value === 1 ? singular : plural}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}
