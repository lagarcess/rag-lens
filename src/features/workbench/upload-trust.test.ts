import { describe, expect, test } from "bun:test";

import { RAG_LIMITS } from "@/lib/rag-config";

import { summarizeUploadTrust } from "./upload-trust";

describe("summarizeUploadTrust", () => {
  test("exposes anonymous upload limits with compact empty-state labels", () => {
    expect(summarizeUploadTrust([])).toEqual({
      maxFileCount: RAG_LIMITS.maxAnonymousFiles,
      maxTotalBytes: RAG_LIMITS.maxAnonymousBytes,
      currentDocumentCount: 0,
      currentUploadedBytes: 0,
      fileCountLabel: "0 / 3 files",
      totalBytesLabel: "0 B / 10 MB",
      fileUsageLabel: "0 of 3",
      totalUsageLabel: "0 B of 10 MB",
    });
  });

  test("counts non-failed upload documents and sums their uploaded bytes", () => {
    const summary = summarizeUploadTrust([
      {
        byteSize: 2048,
        status: "ready",
      },
      {
        byteSize: null,
        status: "processing",
      },
      {
        byteSize: 4096,
        status: "failed",
      },
    ]);

    expect(summary).toMatchObject({
      currentDocumentCount: 2,
      currentUploadedBytes: 2048,
      fileCountLabel: "2 / 3 files",
      totalBytesLabel: "2 KB / 10 MB",
      fileUsageLabel: "2 of 3",
      totalUsageLabel: "2 KB of 10 MB",
    });
  });

  test("keeps the compact file-count label plural for one non-failed document", () => {
    const summary = summarizeUploadTrust([
      {
        byteSize: 1024,
        status: "ready",
      },
    ]);

    expect(summary.fileCountLabel).toBe("1 / 3 files");
  });
});
