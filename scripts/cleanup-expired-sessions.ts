import { getCleanupEnv } from "../src/lib/env";
import { cleanupExpiredUploads } from "../src/lib/uploads/upload-cleanup";
import {
  createSupabaseUploadCleanupRepository,
  createSupabaseUploadStorage,
} from "../src/lib/uploads/supabase-upload-store";

async function main() {
  const env = getCleanupEnv();
  const now = new Date().toISOString();
  const result = await cleanupExpiredUploads({
    repository: createSupabaseUploadCleanupRepository(),
    storage: createSupabaseUploadStorage(),
    bucket: env.SUPABASE_STORAGE_BUCKET,
    now,
    batchSize: env.CLEANUP_BATCH_SIZE,
  });

  console.log(
    JSON.stringify({
      ok: true,
      ...result,
      timestamp: now,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
