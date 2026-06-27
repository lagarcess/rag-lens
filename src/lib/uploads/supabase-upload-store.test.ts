import { describe, expect, test } from "bun:test";

import { createSupabaseUploadCleanupRepository } from "./supabase-upload-store";

describe("createSupabaseUploadCleanupRepository session purge methods", () => {
  test("marks only active anonymous sessions as deleted", async () => {
    const client = new FakeSupabaseClient({
      rag_sessions: { single: { id: "11111111-1111-4111-8111-111111111111" } },
    });
    const repository = createSupabaseUploadCleanupRepository(() => client);

    await expect(
      repository.markAnonymousSessionDeleted({
        now: "2026-06-28T10:00:00.000Z",
        sessionId: "11111111-1111-4111-8111-111111111111",
      }),
    ).resolves.toBe(true);

    expect(client.calls).toEqual([
      { method: "from", table: "rag_sessions" },
      {
        method: "update",
        table: "rag_sessions",
        payload: {
          status: "deleted",
          deleted_at: "2026-06-28T10:00:00.000Z",
          last_seen_at: "2026-06-28T10:00:00.000Z",
        },
      },
      { method: "eq", table: "rag_sessions", column: "id", value: "11111111-1111-4111-8111-111111111111" },
      { method: "eq", table: "rag_sessions", column: "mode", value: "anonymous" },
      { method: "eq", table: "rag_sessions", column: "status", value: "active" },
      { method: "select", table: "rag_sessions", columns: "id" },
      { method: "maybeSingle", table: "rag_sessions" },
    ]);
  });

  test("lists only upload document storage paths for the target session", async () => {
    const client = new FakeSupabaseClient({
      rag_documents: {
        data: [
          { storage_path: "sessions/session-1/doc-a.md" },
          { storage_path: null },
        ],
      },
    });
    const repository = createSupabaseUploadCleanupRepository(() => client);

    await expect(
      repository.listSessionStoragePaths({
        sessionId: "11111111-1111-4111-8111-111111111111",
      }),
    ).resolves.toEqual(["sessions/session-1/doc-a.md"]);

    expect(client.calls).toEqual([
      { method: "from", table: "rag_documents" },
      { method: "select", table: "rag_documents", columns: "storage_path" },
      { method: "eq", table: "rag_documents", column: "session_id", value: "11111111-1111-4111-8111-111111111111" },
      { method: "eq", table: "rag_documents", column: "source_kind", value: "upload" },
    ]);
  });

  test("deletes only rows for an already-deleted anonymous session", async () => {
    const client = new FakeSupabaseClient({
      rag_sessions: { single: { id: "11111111-1111-4111-8111-111111111111" } },
    });
    const repository = createSupabaseUploadCleanupRepository(() => client);

    await expect(
      repository.deleteDeletedSessionRows({
        now: "2026-06-28T10:00:00.000Z",
        sessionId: "11111111-1111-4111-8111-111111111111",
        storagePaths: ["sessions/session-1/doc-a.md"],
      }),
    ).resolves.toEqual({ deleted_sessions: 1 });

    expect(client.calls).toEqual([
      { method: "from", table: "rag_sessions" },
      { method: "delete", table: "rag_sessions" },
      { method: "eq", table: "rag_sessions", column: "id", value: "11111111-1111-4111-8111-111111111111" },
      { method: "eq", table: "rag_sessions", column: "mode", value: "anonymous" },
      { method: "eq", table: "rag_sessions", column: "status", value: "deleted" },
      { method: "select", table: "rag_sessions", columns: "id" },
      { method: "maybeSingle", table: "rag_sessions" },
    ]);
  });
});

type FakeRows = Record<string, { data?: unknown[]; single?: unknown }>;

class FakeSupabaseClient {
  calls: unknown[] = [];

  constructor(private readonly rows: FakeRows) {}

  from(table: string) {
    this.calls.push({ method: "from", table });
    return new FakeQueryBuilder({
      calls: this.calls,
      data: this.rows[table]?.data ?? [],
      single: this.rows[table]?.single ?? null,
      table,
    });
  }
}

class FakeQueryBuilder {
  readonly error = null;

  constructor(
    private readonly input: {
      calls: unknown[];
      data: unknown[];
      single: unknown;
      table: string;
    },
  ) {}

  get data() {
    return this.input.data;
  }

  update(payload: unknown) {
    this.input.calls.push({
      method: "update",
      table: this.input.table,
      payload,
    });
    return this;
  }

  delete() {
    this.input.calls.push({ method: "delete", table: this.input.table });
    return this;
  }

  select(columns: string) {
    this.input.calls.push({
      method: "select",
      table: this.input.table,
      columns,
    });
    return this;
  }

  eq(column: string, value: unknown) {
    this.input.calls.push({
      method: "eq",
      table: this.input.table,
      column,
      value,
    });
    return this;
  }

  async maybeSingle() {
    this.input.calls.push({
      method: "maybeSingle",
      table: this.input.table,
    });

    return {
      data: this.input.single,
      error: null,
    };
  }
}
