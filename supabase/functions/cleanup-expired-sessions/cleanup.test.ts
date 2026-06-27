import { describe, expect, test } from "bun:test";

import {
  authorizeCleanupRequest,
  cleanupExpiredUploadsForEdge,
  parseCleanupBatchSize,
} from "./cleanup";

describe("cleanup Edge Function core", () => {
  test("requires the dedicated cleanup bearer token", () => {
    expect(
      authorizeCleanupRequest({
        authorization: "Bearer cleanup-token",
        cleanupToken: "cleanup-token",
      }),
    ).toBe(true);
    expect(
      authorizeCleanupRequest({
        authorization: "Bearer service-role-key",
        cleanupToken: "cleanup-token",
      }),
    ).toBe(false);
    expect(
      authorizeCleanupRequest({
        authorization: null,
        cleanupToken: "cleanup-token",
      }),
    ).toBe(false);
  });

  test("removes Supabase Storage paths before deleting expired database rows", async () => {
    const adapter = new FakeEdgeCleanupAdapter([
      "sessions/session-a/upload-a.md",
      "sessions/session-b/upload-b.md",
    ]);

    const result = await cleanupExpiredUploadsForEdge({
      adapter,
      bucket: "rag-uploads",
      now: "2026-06-28T10:00:00.000Z",
      batchSize: 100,
      dryRun: false,
    });

    expect(adapter.calls).toEqual([
      ["list", "2026-06-28T10:00:00.000Z", 100],
      [
        "remove",
        "rag-uploads",
        ["sessions/session-a/upload-a.md", "sessions/session-b/upload-b.md"],
      ],
      [
        "delete",
        "2026-06-28T10:00:00.000Z",
        ["sessions/session-a/upload-a.md", "sessions/session-b/upload-b.md"],
      ],
    ]);
    expect(result).toEqual({
      ok: true,
      dryRun: false,
      purgeableStorageObjects: 2,
      removedStorageObjects: 2,
      deletedRows: [{ deleted_sessions: 1, deleted_documents: 2 }],
      timestamp: "2026-06-28T10:00:00.000Z",
    });
  });

  test("dry run reports counts without deleting Storage or database rows", async () => {
    const adapter = new FakeEdgeCleanupAdapter(["sessions/session-a/upload-a.md"]);

    const result = await cleanupExpiredUploadsForEdge({
      adapter,
      bucket: "rag-uploads",
      now: "2026-06-28T10:00:00.000Z",
      batchSize: 25,
      dryRun: true,
    });

    expect(adapter.calls).toEqual([
      ["list", "2026-06-28T10:00:00.000Z", 25],
    ]);
    expect(result).toMatchObject({
      ok: true,
      dryRun: true,
      purgeableStorageObjects: 1,
      removedStorageObjects: 0,
      deletedRows: null,
    });
  });

  test("parses positive cleanup batch sizes only", () => {
    expect(parseCleanupBatchSize("25")).toBe(25);
    expect(parseCleanupBatchSize(undefined)).toBe(100);
    expect(parseCleanupBatchSize("0")).toBe(100);
    expect(parseCleanupBatchSize("not-a-number")).toBe(100);
  });
});

class FakeEdgeCleanupAdapter {
  readonly calls: unknown[][] = [];

  constructor(private readonly paths: string[]) {}

  async listPurgeableStoragePaths(input: { now: string; batchSize: number }) {
    this.calls.push(["list", input.now, input.batchSize]);
    return this.paths;
  }

  async removeStoragePaths(input: { bucket: string; paths: string[] }) {
    this.calls.push(["remove", input.bucket, input.paths]);
  }

  async deleteExpiredRows(input: { now: string; storagePaths: string[] }) {
    this.calls.push(["delete", input.now, input.storagePaths]);
    return [{ deleted_sessions: 1, deleted_documents: 2 }];
  }
}
