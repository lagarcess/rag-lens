import type { RagCitation, RagTraceResponse } from "@/lib/rag/trace";

export interface TraceEvidence {
  summary: string;
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
    summary: `${formatUnit(
      trace.retrieval.rows.length,
      "evidence match",
      "evidence matches",
    )} found; ${formatUnit(
      trace.prompt.contextChunkIds.length,
      "chunk",
    )} sent to the model prompt.`,
    stages: [
      {
        label: "Read documents",
        value: formatUnit(trace.extraction.documents.length, "doc"),
        detail: extractionDetail || "No documents extracted",
      },
      {
        label: "Split into chunks",
        value: formatUnit(trace.chunking.totalChunks, "chunk"),
        detail: `${formatNumber(
          trace.settings.chunkSize,
        )} characters each · ${formatNumber(trace.settings.chunkOverlap)} overlap`,
      },
      {
        label: "Compared meaning",
        value: trace.models.embedding.provider,
        detail: formatEmbeddingDetail(result),
      },
      {
        label: "Found evidence",
        value: formatUnit(trace.retrieval.rows.length, "match", "matches"),
        detail: `${formatUnit(trace.retrieval.rows.length, "row")} · ${formatUnit(
          selectedCount,
          "sent to prompt",
          "sent to prompt",
        )} · ${trace.retrieval.method}`,
      },
      {
        label: "Built prompt",
        value: `${formatNumber(trace.prompt.rendered.length)} chars`,
        detail: formatUnit(trace.prompt.contextChunkIds.length, "context chunk"),
      },
      {
        label: "Generated answer",
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
      ["full run", `${formatNumber(trace.timingsMs.total)} ms`],
      ["finding evidence", `${formatNumber(trace.timingsMs.retrieval)} ms`],
      ["writing answer", `${formatNumber(trace.timingsMs.generation)} ms`],
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

export function buildTraceChunkRows(result: RagTraceResponse): TraceChunkRow[] {
  const retrievalRowsById = new Map(
    result.trace.retrieval.rows.map((row) => [row.chunkId, row]),
  );

  return result.trace.chunking.chunks.map((chunk) => {
    const retrievalRow = retrievalRowsById.get(chunk.chunkId);

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
