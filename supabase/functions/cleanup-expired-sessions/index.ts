import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "@supabase/supabase-js";

import {
  authorizeCleanupRequest,
  cleanupExpiredUploadsForEdge,
  parseCleanupBatchSize,
  type EdgeCleanupAdapter,
} from "./cleanup.ts";

const JSON_HEADERS = {
  "content-type": "application/json",
  "connection": "keep-alive",
};

Deno.serve(async (req) => {
  const timestamp = new Date().toISOString();

  try {
    if (req.method !== "POST") {
      return Response.json(
        { ok: false, error: "Method not allowed", timestamp },
        { headers: JSON_HEADERS, status: 405 },
      );
    }

    const cleanupToken = Deno.env.get("RAG_LENS_CLEANUP_TOKEN");
    const serviceRoleKey = getServiceRoleKey();
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!cleanupToken || !serviceRoleKey || !supabaseUrl) {
      return Response.json(
        { ok: false, error: "Cleanup function is not configured", timestamp },
        { headers: JSON_HEADERS, status: 500 },
      );
    }

    if (
      !authorizeCleanupRequest({
        authorization: req.headers.get("authorization"),
        cleanupToken,
      })
    ) {
      return Response.json(
        { ok: false, error: "Unauthorized", timestamp },
        { headers: JSON_HEADERS, status: 401 },
      );
    }

    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dry_run") === "true";
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const result = await cleanupExpiredUploadsForEdge({
      adapter: createSupabaseCleanupAdapter(supabase),
      bucket: Deno.env.get("SUPABASE_STORAGE_BUCKET") ?? "rag-uploads",
      now: timestamp,
      batchSize: parseCleanupBatchSize(Deno.env.get("CLEANUP_BATCH_SIZE")),
      dryRun,
    });

    return Response.json(result, { headers: JSON_HEADERS });
  } catch {
    return Response.json(
      { ok: false, error: "Cleanup failed", timestamp },
      { headers: JSON_HEADERS, status: 500 },
    );
  }
});

function getServiceRoleKey() {
  const legacyServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (legacyServiceRoleKey) {
    return legacyServiceRoleKey;
  }

  const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");

  if (!secretKeysJson) {
    return null;
  }

  try {
    const secretKeys = JSON.parse(secretKeysJson) as Record<string, string>;
    return secretKeys.default ?? Object.values(secretKeys)[0] ?? null;
  } catch {
    return null;
  }
}

function createSupabaseCleanupAdapter(
  supabase: ReturnType<typeof createClient>,
): EdgeCleanupAdapter {
  return {
    async listPurgeableStoragePaths({ now, batchSize }) {
      const { data, error } = await supabase.rpc(
        "list_purgeable_rag_storage_paths",
        {
          p_now: now,
          p_limit: batchSize,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      return ((data ?? []) as Array<{ storage_path?: string | null }>)
        .map((row) => row.storage_path)
        .filter((path: string | null | undefined): path is string =>
          Boolean(path),
        );
    },

    async removeStoragePaths({ bucket, paths }) {
      const { error } = await supabase.storage.from(bucket).remove(paths);

      if (error) {
        throw new Error(error.message);
      }
    },

    async deleteExpiredRows({ now, storagePaths }) {
      const { data, error } = await supabase.rpc("delete_expired_rag_rows", {
        p_now: now,
        p_storage_paths: storagePaths,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  };
}
