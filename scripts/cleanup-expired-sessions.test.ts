import { describe, expect, test } from "bun:test";

import {
  formatCleanupLog,
  formatCleanupErrorLog,
  parseCleanupArgs,
  runCleanupCli,
} from "./cleanup-expired-sessions";

describe("cleanup-expired-sessions CLI helpers", () => {
  test("parses dry-run flags", () => {
    expect(parseCleanupArgs([])).toEqual({ dryRun: false });
    expect(parseCleanupArgs(["--dry-run"])).toEqual({ dryRun: true });
    expect(parseCleanupArgs(["--check"])).toEqual({ dryRun: true });
  });

  test("rejects unknown flags so typos cannot trigger real cleanup", () => {
    expect(() => parseCleanupArgs(["--dryrun"])).toThrow("Unknown cleanup flag");
  });

  test("formats count-only JSON without storage paths", () => {
    const line = formatCleanupLog({
      timestamp: "2026-06-28T10:00:00.000Z",
      result: {
        dryRun: true,
        purgeableStorageObjects: 2,
        removedStorageObjects: 0,
        deletedRows: null,
      },
    });

    expect(line).toBe(
      JSON.stringify({
        ok: true,
        dryRun: true,
        purgeableStorageObjects: 2,
        removedStorageObjects: 0,
        deletedRows: null,
        timestamp: "2026-06-28T10:00:00.000Z",
      }),
    );
    expect(line).not.toContain("sessions/");
  });

  test("formats sanitized error JSON without raw storage paths", () => {
    const line = formatCleanupErrorLog({
      timestamp: "2026-06-28T10:00:00.000Z",
    });

    expect(line).toBe(
      JSON.stringify({
        ok: false,
        error: "Cleanup failed",
        timestamp: "2026-06-28T10:00:00.000Z",
      }),
    );
    expect(line).not.toContain("sessions/");
  });

  test("runs cleanup in dry-run mode with cleanup-only env", async () => {
    const outputs: string[] = [];
    const result = await runCleanupCli({
      args: ["--dry-run"],
      env: {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role",
        SUPABASE_STORAGE_BUCKET: "rag-uploads",
        CLEANUP_BATCH_SIZE: "25",
      },
      now: () => "2026-06-28T10:00:00.000Z",
      writeOutput: (line) => outputs.push(line),
      cleanup: async (input) => ({
        dryRun: input.dryRun,
        purgeableStorageObjects: 2,
        removedStorageObjects: 0,
        deletedRows: null,
      }),
    });

    expect(result).toMatchObject({
      dryRun: true,
      purgeableStorageObjects: 2,
      removedStorageObjects: 0,
    });
    expect(outputs).toEqual([
      JSON.stringify({
        ok: true,
        dryRun: true,
        purgeableStorageObjects: 2,
        removedStorageObjects: 0,
        deletedRows: null,
        timestamp: "2026-06-28T10:00:00.000Z",
      }),
    ]);
  });
});
