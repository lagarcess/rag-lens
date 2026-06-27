import { getCleanupEnv } from "../src/lib/env";
import { createSupabaseAdminClient } from "../src/lib/supabase-admin";

async function main() {
  const env = getCleanupEnv();
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: expiredDocuments, error: listError } = await supabase
    .from("rag_documents")
    .select("storage_path")
    .lte("expires_at", now)
    .not("storage_path", "is", null)
    .limit(env.CLEANUP_BATCH_SIZE);

  if (listError) {
    throw listError;
  }

  const storagePaths =
    expiredDocuments
      ?.map((document) => document.storage_path)
      .filter((path): path is string => Boolean(path)) ?? [];

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .remove(storagePaths);

    if (storageError) {
      throw storageError;
    }
  }

  const { data, error } = await supabase.rpc("delete_expired_rag_rows", {
    p_now: now,
  });

  if (error) {
    throw error;
  }

  console.log(
    JSON.stringify({
      ok: true,
      removedStorageObjects: storagePaths.length,
      deletedRows: data,
      timestamp: now,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
