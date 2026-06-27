import { describe, expect, test } from "bun:test";

import { cleanupExpiredUploads } from "./upload-cleanup";

describe("cleanupExpiredUploads", () => {
  test("removes hard-expired and deleted-session storage paths before deleting rows", async () => {
    const repository = new FakeCleanupRepository([
      "sessions/session-1/doc-hard-expired.md",
      "sessions/session-2/doc-deleted.md",
    ]);
    const storage = new FakeCleanupStorage();

    const result = await cleanupExpiredUploads({
      repository,
      storage,
      bucket: "rag-uploads",
      now: "2026-06-28T10:00:00.000Z",
      batchSize: 100,
    });

    expect(repository.listCall).toEqual({
      now: "2026-06-28T10:00:00.000Z",
      batchSize: 100,
    });
    expect(storage.removed).toEqual([
      {
        bucket: "rag-uploads",
        paths: [
          "sessions/session-1/doc-hard-expired.md",
          "sessions/session-2/doc-deleted.md",
        ],
      },
    ]);
    expect(repository.deletedAt).toBe("2026-06-28T10:00:00.000Z");
    expect(repository.deletedStoragePaths).toEqual([
      "sessions/session-1/doc-hard-expired.md",
      "sessions/session-2/doc-deleted.md",
    ]);
    expect(result).toEqual({
      dryRun: false,
      purgeableStorageObjects: 2,
      removedStorageObjects: 2,
      deletedRows: [{ deleted_sessions: 1, deleted_documents: 2 }],
    });
  });

  test("dry-run reports purgeable counts without removing storage or deleting rows", async () => {
    const repository = new FakeCleanupRepository([
      "sessions/session-1/doc-hard-expired.md",
      "sessions/session-2/doc-deleted.md",
    ]);
    const storage = new FakeCleanupStorage();

    const result = await cleanupExpiredUploads({
      repository,
      storage,
      bucket: "rag-uploads",
      now: "2026-06-28T10:00:00.000Z",
      batchSize: 100,
      dryRun: true,
    });

    expect(repository.listCall).toEqual({
      now: "2026-06-28T10:00:00.000Z",
      batchSize: 100,
    });
    expect(storage.removed).toEqual([]);
    expect(repository.deletedAt).toBeNull();
    expect(repository.deletedStoragePaths).toBeNull();
    expect(result).toEqual({
      dryRun: true,
      purgeableStorageObjects: 2,
      removedStorageObjects: 0,
      deletedRows: null,
    });
  });
});

class FakeCleanupRepository {
  listCall: { now: string; batchSize: number } | null = null;
  deletedAt: string | null = null;
  deletedStoragePaths: string[] | null = null;

  constructor(private readonly paths: string[]) {}

  async listPurgeableStoragePaths(input: { now: string; batchSize: number }) {
    this.listCall = input;
    return this.paths;
  }

  async deleteExpiredRows(input: { now: string; storagePaths: string[] }) {
    this.deletedAt = input.now;
    this.deletedStoragePaths = input.storagePaths;
    return [{ deleted_sessions: 1, deleted_documents: 2 }];
  }
}

class FakeCleanupStorage {
  removed: Array<{ bucket: string; paths: string[] }> = [];

  async remove(input: { bucket: string; paths: string[] }) {
    this.removed.push(input);
  }
}
