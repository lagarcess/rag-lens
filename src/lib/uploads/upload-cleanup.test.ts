import { describe, expect, test } from "bun:test";

import {
  AnonymousSessionPurgeError,
  cleanupExpiredUploads,
  purgeAnonymousSessionNow,
} from "./upload-cleanup";

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

describe("purgeAnonymousSessionNow", () => {
  test("purges one deleted session by removing storage before deleting rows", async () => {
    const repository = new FakeCleanupRepository([
      "sessions/session-1/doc-a.md",
      "sessions/session-1/doc-b.md",
    ]);
    const storage = new FakeCleanupStorage();

    const result = await purgeAnonymousSessionNow({
      repository,
      storage,
      bucket: "rag-uploads",
      now: "2026-06-28T10:00:00.000Z",
      sessionId: "11111111-1111-4111-8111-111111111111",
    });

    expect(repository.markCall).toEqual({
      now: "2026-06-28T10:00:00.000Z",
      sessionId: "11111111-1111-4111-8111-111111111111",
    });
    expect(repository.sessionListCall).toEqual({
      sessionId: "11111111-1111-4111-8111-111111111111",
    });
    expect(storage.removed).toEqual([
      {
        bucket: "rag-uploads",
        paths: [
          "sessions/session-1/doc-a.md",
          "sessions/session-1/doc-b.md",
        ],
      },
    ]);
    expect(repository.deletedSessionCall).toEqual({
      now: "2026-06-28T10:00:00.000Z",
      sessionId: "11111111-1111-4111-8111-111111111111",
      storagePaths: [
        "sessions/session-1/doc-a.md",
        "sessions/session-1/doc-b.md",
      ],
    });
    expect(result).toEqual({
      ok: true,
      sessionId: "11111111-1111-4111-8111-111111111111",
      purgeStatus: "completed",
      purgeRetryScheduled: false,
      storageObjects: 2,
      removedStorageObjects: 2,
      deletedRows: [{ deleted_sessions: 1, deleted_documents: 2 }],
    });
  });

  test("does not delete database rows when storage removal fails", async () => {
    const repository = new FakeCleanupRepository(["sessions/session-1/doc-a.md"]);
    const storage = new FakeCleanupStorage(new Error("Storage unavailable"));

    const purge = purgeAnonymousSessionNow({
      repository,
      storage,
      bucket: "rag-uploads",
      now: "2026-06-28T10:00:00.000Z",
      sessionId: "11111111-1111-4111-8111-111111111111",
    });

    await expect(purge).rejects.toThrow(AnonymousSessionPurgeError);
    await expect(purge).rejects.toMatchObject({
      stage: "remove-storage",
    });

    expect(repository.deletedSessionCall).toBeNull();
  });

  test("does not list storage when marking the session fails", async () => {
    const repository = new FakeCleanupRepository(["sessions/session-1/doc-a.md"]);
    repository.markError = new Error("Database unavailable");
    const storage = new FakeCleanupStorage();

    await expect(
      purgeAnonymousSessionNow({
        repository,
        storage,
        bucket: "rag-uploads",
        now: "2026-06-28T10:00:00.000Z",
        sessionId: "11111111-1111-4111-8111-111111111111",
      }),
    ).rejects.toThrow("Database unavailable");

    expect(repository.sessionListCall).toBeNull();
    expect(storage.removed).toEqual([]);
  });

  test("deletes zero-path anonymous sessions without calling storage", async () => {
    const repository = new FakeCleanupRepository([]);
    const storage = new FakeCleanupStorage();

    const result = await purgeAnonymousSessionNow({
      repository,
      storage,
      bucket: "rag-uploads",
      now: "2026-06-28T10:00:00.000Z",
      sessionId: "11111111-1111-4111-8111-111111111111",
    });

    expect(storage.removed).toEqual([]);
    expect(repository.deletedSessionCall).toEqual({
      now: "2026-06-28T10:00:00.000Z",
      sessionId: "11111111-1111-4111-8111-111111111111",
      storagePaths: [],
    });
    expect(result?.storageObjects).toBe(0);
    expect(result?.removedStorageObjects).toBe(0);
  });

  test("returns null when an anonymous session cannot be marked deleted", async () => {
    const repository = new FakeCleanupRepository(["sessions/session-1/doc-a.md"]);
    repository.markResult = false;
    const storage = new FakeCleanupStorage();

    const result = await purgeAnonymousSessionNow({
      repository,
      storage,
      bucket: "rag-uploads",
      now: "2026-06-28T10:00:00.000Z",
      sessionId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result).toBeNull();
    expect(repository.sessionListCall).toBeNull();
    expect(storage.removed).toEqual([]);
    expect(repository.deletedSessionCall).toBeNull();
  });
});

class FakeCleanupRepository {
  markCall: { now: string; sessionId: string } | null = null;
  markResult = true;
  markError: Error | null = null;
  listCall: { now: string; batchSize: number } | null = null;
  sessionListCall: { sessionId: string } | null = null;
  deletedAt: string | null = null;
  deletedStoragePaths: string[] | null = null;
  deletedSessionCall: {
    now: string;
    sessionId: string;
    storagePaths: string[];
  } | null = null;

  constructor(private readonly paths: string[]) {}

  async markAnonymousSessionDeleted(input: { now: string; sessionId: string }) {
    if (this.markError) {
      throw this.markError;
    }

    this.markCall = input;
    return this.markResult;
  }

  async listPurgeableStoragePaths(input: { now: string; batchSize: number }) {
    this.listCall = input;
    return this.paths;
  }

  async deleteExpiredRows(input: { now: string; storagePaths: string[] }) {
    this.deletedAt = input.now;
    this.deletedStoragePaths = input.storagePaths;
    return [{ deleted_sessions: 1, deleted_documents: 2 }];
  }

  async listSessionStoragePaths(input: { sessionId: string }) {
    this.sessionListCall = input;
    return this.paths;
  }

  async deleteDeletedSessionRows(input: {
    now: string;
    sessionId: string;
    storagePaths: string[];
  }) {
    this.deletedSessionCall = input;
    return [{ deleted_sessions: 1, deleted_documents: 2 }];
  }
}

class FakeCleanupStorage {
  removed: Array<{ bucket: string; paths: string[] }> = [];

  constructor(private readonly error: Error | null = null) {}

  async remove(input: { bucket: string; paths: string[] }) {
    if (this.error) {
      throw this.error;
    }

    this.removed.push(input);
  }
}
