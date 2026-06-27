import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";

class MockAnonymousSessionPurgeError extends Error {
  constructor(readonly stage: "list-storage" | "remove-storage" | "delete-rows") {
    super("Anonymous session was marked deleted, but cleanup could not finish.");
    this.name = "AnonymousSessionPurgeError";
  }
}

const purgeCalls: unknown[] = [];
let purgeResult: unknown = null;
let purgeError: Error | null = null;

mock.module("@/lib/uploads/upload-cleanup", () => ({
  AnonymousSessionPurgeError: MockAnonymousSessionPurgeError,
  purgeAnonymousSessionNow: async (input: unknown) => {
    purgeCalls.push(input);

    if (purgeError) {
      throw purgeError;
    }

    return purgeResult;
  },
}));

mock.module("@/lib/uploads/supabase-upload-store", () => ({
  createSupabaseUploadCleanupRepository: () => ({ kind: "repository" }),
  createSupabaseUploadStorage: () => ({ kind: "storage" }),
  getUploadBucket: () => "rag-uploads",
}));

let DELETE: typeof import("./route").DELETE;

describe("DELETE /api/sessions/:sessionId", () => {
  beforeAll(async () => {
    ({ DELETE } = await import("./route"));
  });

  beforeEach(() => {
    purgeCalls.length = 0;
    purgeError = null;
    purgeResult = {
      ok: true,
      sessionId: "11111111-1111-4111-8111-111111111111",
      purgeStatus: "completed",
      purgeRetryScheduled: false,
      storageObjects: 1,
      removedStorageObjects: 1,
      deletedRows: { deleted_sessions: 1 },
    };
  });

  test("returns cleanup metadata after purging the anonymous session", async () => {
    const response = await DELETE(new Request("http://localhost/api"), {
      params: Promise.resolve({
        sessionId: "11111111-1111-4111-8111-111111111111",
      }),
    });

    await expect(response.json()).resolves.toEqual(purgeResult);
    expect(response.status).toBe(200);
    expect(purgeCalls[0]).toMatchObject({
      bucket: "rag-uploads",
      sessionId: "11111111-1111-4111-8111-111111111111",
    });
  });

  test("returns 404 when the anonymous session cannot be marked deleted", async () => {
    purgeResult = null;

    const response = await DELETE(new Request("http://localhost/api"), {
      params: Promise.resolve({
        sessionId: "99999999-9999-4999-8999-999999999999",
      }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Session not found",
    });
  });

  test("returns retry-pending metadata when cleanup fails after deletion", async () => {
    const previousWarn = console.warn;
    console.warn = () => undefined;
    purgeError = new MockAnonymousSessionPurgeError("remove-storage");

    try {
      const response = await DELETE(new Request("http://localhost/api"), {
        params: Promise.resolve({
          sessionId: "11111111-1111-4111-8111-111111111111",
        }),
      });

      expect(response.status).toBe(202);
      await expect(response.json()).resolves.toEqual({
        ok: true,
        sessionId: "11111111-1111-4111-8111-111111111111",
        purgeStatus: "retry-pending",
        purgeRetryScheduled: true,
        warning:
          "Session deleted. Immediate file cleanup could not be confirmed, so scheduled cleanup will retry during the monthly purge.",
      });
    } finally {
      console.warn = previousWarn;
    }
  });

  test("returns 500 when the session cannot be deleted", async () => {
    purgeError = new Error("Database unavailable");

    const response = await DELETE(new Request("http://localhost/api"), {
      params: Promise.resolve({
        sessionId: "11111111-1111-4111-8111-111111111111",
      }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to delete session",
    });
  });
});
