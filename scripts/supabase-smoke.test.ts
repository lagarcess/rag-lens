import { describe, expect, test } from "bun:test";

import {
  formatSupabaseSmokeErrorLog,
  parseSupabaseSmokeArgs,
  runSupabaseSmoke,
} from "./supabase-smoke";

describe("supabase-smoke helpers", () => {
  test("parses json and rejects unknown flags", () => {
    expect(parseSupabaseSmokeArgs([])).toEqual({ json: false });
    expect(parseSupabaseSmokeArgs(["--json"])).toEqual({ json: true });

    expect(() => parseSupabaseSmokeArgs(["--delete-fixtures"])).toThrow(
      "Unknown Supabase smoke flag",
    );
    expect(() => parseSupabaseSmokeArgs(["--mutating"])).toThrow(
      "Unknown Supabase smoke flag",
    );
  });

  test("runs read-only hosted checks and emits sanitized JSON", async () => {
    const outputs: string[] = [];
    const result = await runSupabaseSmoke({
      args: ["--json"],
      now: () => "2026-06-28T10:00:00.000Z",
      writeOutput: (line) => outputs.push(line),
      checks: {
        storage: async () => ({
          bucket: "rag-uploads",
          reachable: true,
        }),
        examples: async () => ({
          expectedCorpora: 3,
          exampleCorpora: 3,
          readyDocuments: 3,
          indexedChunks: 9,
        }),
        vector: async () => ({
          corpusSlug: "rag-concepts-primer",
          retrievedRows: 2,
          topSimilarity: 0.88,
        }),
        cleanupDryRun: async () => ({
          purgeableStorageObjects: 0,
          removedStorageObjects: 0,
        }),
      },
    });

    expect(result).toEqual({
      ok: true,
      mode: "read-only",
      timestamp: "2026-06-28T10:00:00.000Z",
      stages: [
        {
          name: "storage",
          ok: true,
          detail: {
            bucket: "rag-uploads",
            reachable: true,
          },
        },
        {
          name: "examples",
          ok: true,
          detail: {
            expectedCorpora: 3,
            exampleCorpora: 3,
            readyDocuments: 3,
            indexedChunks: 9,
          },
        },
        {
          name: "vector",
          ok: true,
          detail: {
            corpusSlug: "rag-concepts-primer",
            retrievedRows: 2,
            topSimilarity: 0.88,
          },
        },
        {
          name: "cleanup-dry-run",
          ok: true,
          detail: {
            purgeableStorageObjects: 0,
            removedStorageObjects: 0,
          },
        },
      ],
    });
    expect(outputs).toEqual([JSON.stringify(result)]);
    expect(outputs[0]).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(outputs[0]).not.toContain("PERPLEXITY_API_KEY");
    expect(outputs[0]).not.toContain("OPENROUTER_API_KEY");
  });

  test("formats failure logs without leaking secret-bearing messages", () => {
    const line = formatSupabaseSmokeErrorLog({
      timestamp: "2026-06-28T10:00:00.000Z",
      error: new Error(
        "Request failed with SUPABASE_SERVICE_ROLE_KEY=secret and PERPLEXITY_API_KEY=secret",
      ),
    });

    expect(line).toBe(
      JSON.stringify({
        ok: false,
        error: "Supabase smoke failed",
        reason:
          "Review Supabase env, migrations, seed data, storage bucket, and vector retrieval.",
        timestamp: "2026-06-28T10:00:00.000Z",
      }),
    );
    expect(line).not.toContain("secret");
    expect(line).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(line).not.toContain("PERPLEXITY_API_KEY");
  });
});
