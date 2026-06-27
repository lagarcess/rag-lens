import { RAG_LIMITS } from "@/lib/rag-config";

type UploadTrustStatus = "pending" | "processing" | "ready" | "failed";

export interface UploadTrustDocument {
  byteSize: number | null;
  status: UploadTrustStatus;
}

export interface UploadTrustSummary {
  maxFileCount: number;
  maxTotalBytes: number;
  currentDocumentCount: number;
  currentUploadedBytes: number;
  fileCountLabel: string;
  totalBytesLabel: string;
}

export function summarizeUploadTrust(
  documents: UploadTrustDocument[],
): UploadTrustSummary {
  const activeDocuments = documents.filter(
    (document) => document.status !== "failed",
  );
  const currentUploadedBytes = activeDocuments.reduce(
    (total, document) =>
      total + (document.byteSize && document.byteSize > 0 ? document.byteSize : 0),
    0,
  );

  return {
    maxFileCount: RAG_LIMITS.maxAnonymousFiles,
    maxTotalBytes: RAG_LIMITS.maxAnonymousBytes,
    currentDocumentCount: activeDocuments.length,
    currentUploadedBytes,
    fileCountLabel: `${activeDocuments.length} / ${RAG_LIMITS.maxAnonymousFiles} files`,
    totalBytesLabel: `${formatCompactBytes(currentUploadedBytes)} / ${formatCompactBytes(
      RAG_LIMITS.maxAnonymousBytes,
    )}`,
  };
}

function formatCompactBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${formatCompactNumber(bytes / 1024)} KB`;
  }

  return `${formatCompactNumber(bytes / (1024 * 1024))} MB`;
}

function formatCompactNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
