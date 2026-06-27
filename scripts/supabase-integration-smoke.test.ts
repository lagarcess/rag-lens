import { describe, expect, test } from "bun:test";

import {
  formatSupabaseIntegrationSmokeErrorLog,
  parseSupabaseIntegrationSmokeArgs,
  runMutatingSupabaseFixtureSmoke,
  runSupabaseIntegrationSmoke,
} from "./supabase-integration-smoke";

describe("supabase-integration-smoke helpers", () => {
  test("parses json and rejects unknown flags", () => {
    expect(parseSupabaseIntegrationSmokeArgs([])).toEqual({ json: false });
    expect(parseSupabaseIntegrationSmokeArgs(["--json"])).toEqual({
      json: true,
    });

    expect(() =>
      parseSupabaseIntegrationSmokeArgs(["--mutating"]),
    ).toThrow("Unknown Supabase integration smoke flag");
  });

  test("runs the disposable fixture command and emits sanitized JSON", async () => {
    const outputs: string[] = [];
    const result = await runSupabaseIntegrationSmoke({
      args: ["--json"],
      now: () => "2026-06-28T10:00:00.000Z",
      writeOutput: (line) => outputs.push(line),
      runFixture: async () => ({
        uploadedDocuments: 1,
        indexedChunks: 1,
        retrievedRows: 1,
        persistedTraces: 1,
        removedStorageObjects: 1,
        rowsRemaining: 0,
        storageObjectsRemaining: 0,
      }),
    });

    expect(result).toEqual({
      ok: true,
      mode: "mutating-fixture",
      timestamp: "2026-06-28T10:00:00.000Z",
      detail: {
        uploadedDocuments: 1,
        indexedChunks: 1,
        retrievedRows: 1,
        persistedTraces: 1,
        removedStorageObjects: 1,
        rowsRemaining: 0,
        storageObjectsRemaining: 0,
      },
    });
    expect(outputs).toEqual([JSON.stringify(result)]);
    expect(outputs[0]).not.toContain("sessions/");
    expect(outputs[0]).not.toContain("11111111");
    expect(outputs[0]).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(outputs[0]).not.toContain("PERPLEXITY_API_KEY");
  });

  test("purges the fixture session when the workflow fails", async () => {
    const calls: string[] = [];

    await expect(
      runMutatingSupabaseFixtureSmoke({
        createSession: async () => {
          calls.push("createSession");
          return {
            sessionId: "11111111-1111-4111-8111-111111111111",
            expiresAt: "2026-06-28T12:00:00.000Z",
            hardExpiresAt: "2026-06-29T09:30:00.000Z",
          };
        },
        uploadDocument: async () => {
          calls.push("uploadDocument");
          throw new Error("upload fixture failed");
        },
        queryAndPersistTrace: async () => {
          calls.push("queryAndPersistTrace");
          throw new Error("query should not run");
        },
        loadPersistedTrace: async () => {
          calls.push("loadPersistedTrace");
          throw new Error("load should not run");
        },
        purgeSession: async () => {
          calls.push("purgeSession");
          return {
            removedStorageObjects: 0,
          };
        },
        assertPurged: async () => {
          calls.push("assertPurged");
          return {
            rowsRemaining: 0,
            storageObjectsRemaining: 0,
          };
        },
      }),
    ).rejects.toThrow("upload fixture failed");

    expect(calls).toEqual([
      "createSession",
      "uploadDocument",
      "purgeSession",
      "assertPurged",
    ]);
  });

  test("returns only count metadata for a successful mutating fixture", async () => {
    const detail = await runMutatingSupabaseFixtureSmoke({
      createSession: async () => ({
        sessionId: "11111111-1111-4111-8111-111111111111",
        expiresAt: "2026-06-28T12:00:00.000Z",
        hardExpiresAt: "2026-06-29T09:30:00.000Z",
      }),
      uploadDocument: async () => ({
        documentId: "22222222-2222-4222-8222-222222222222",
        storagePath:
          "sessions/11111111-1111-4111-8111-111111111111/fixture.txt",
        extractedCharacters: 120,
      }),
      queryAndPersistTrace: async () => ({
        queryId: "33333333-3333-4333-8333-333333333333",
        indexedChunks: 1,
        retrievedRows: 1,
        persistedTraces: 1,
      }),
      loadPersistedTrace: async () => ({
        queryId: "33333333-3333-4333-8333-333333333333",
        retrievedRows: 1,
        persistenceMode: "session",
      }),
      purgeSession: async () => ({
        removedStorageObjects: 1,
      }),
      assertPurged: async () => ({
        rowsRemaining: 0,
        storageObjectsRemaining: 0,
      }),
    });

    expect(detail).toEqual({
      uploadedDocuments: 1,
      indexedChunks: 1,
      retrievedRows: 1,
      persistedTraces: 1,
      removedStorageObjects: 1,
      rowsRemaining: 0,
      storageObjectsRemaining: 0,
    });
    expect(JSON.stringify(detail)).not.toContain("11111111");
    expect(JSON.stringify(detail)).not.toContain("sessions/");
  });

  test("formats failure logs without leaking secret-bearing messages", () => {
    const line = formatSupabaseIntegrationSmokeErrorLog({
      timestamp: "2026-06-28T10:00:00.000Z",
      error: new Error(
        "Request failed with SUPABASE_SERVICE_ROLE_KEY=secret and PERPLEXITY_API_KEY=secret",
      ),
    });

    expect(line).toBe(
      JSON.stringify({
        ok: false,
        error: "Supabase integration smoke failed",
        reason:
          "Review Supabase env, upload ingestion, vector retrieval, trace persistence, and cleanup.",
        timestamp: "2026-06-28T10:00:00.000Z",
      }),
    );
    expect(line).not.toContain("secret");
    expect(line).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(line).not.toContain("PERPLEXITY_API_KEY");
  });
});
