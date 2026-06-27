import { getCleanupEnv, getCleanupEnvFrom } from "../src/lib/env";
import {
  cleanupExpiredUploads,
  type UploadCleanupResult,
} from "../src/lib/uploads/upload-cleanup";
import {
  createSupabaseUploadCleanupRepository,
  createSupabaseUploadStorage,
} from "../src/lib/uploads/supabase-upload-store";

type CleanupEnv = ReturnType<typeof getCleanupEnv>;

export interface CleanupCliOptions {
  args: string[];
  env?: Record<string, string | undefined>;
  now?: () => string;
  writeOutput?: (line: string) => void;
  cleanup?: (input: {
    env: CleanupEnv;
    now: string;
    dryRun: boolean;
  }) => Promise<UploadCleanupResult>;
}

export function parseCleanupArgs(args: string[]) {
  const allowedFlags = new Set(["--dry-run", "--check"]);
  const unknownFlag = args.find(
    (arg) => arg.startsWith("--") && !allowedFlags.has(arg),
  );

  if (unknownFlag) {
    throw new Error(`Unknown cleanup flag: ${unknownFlag}`);
  }

  return {
    dryRun: args.includes("--dry-run") || args.includes("--check"),
  };
}

export function formatCleanupLog(input: {
  timestamp: string;
  result: UploadCleanupResult;
}) {
  return JSON.stringify({
    ok: true,
    ...input.result,
    timestamp: input.timestamp,
  });
}

export function formatCleanupErrorLog(input: { timestamp: string }) {
  return JSON.stringify({
    ok: false,
    error: "Cleanup failed",
    timestamp: input.timestamp,
  });
}

export async function runCleanupCli(options: CleanupCliOptions) {
  const envSource = options.env
    ? getCleanupEnvFrom(options.env)
    : getCleanupEnv();
  const timestamp = options.now?.() ?? new Date().toISOString();
  const args = parseCleanupArgs(options.args);
  const cleanup = options.cleanup ?? runSupabaseCleanup;
  const result = await cleanup({
    env: envSource,
    now: timestamp,
    dryRun: args.dryRun,
  });

  (options.writeOutput ?? console.log)(
    formatCleanupLog({
      timestamp,
      result,
    }),
  );

  return result;
}

async function runSupabaseCleanup(input: {
  env: CleanupEnv;
  now: string;
  dryRun: boolean;
}) {
  return cleanupExpiredUploads({
    repository: createSupabaseUploadCleanupRepository(),
    storage: createSupabaseUploadStorage(),
    bucket: input.env.SUPABASE_STORAGE_BUCKET,
    now: input.now,
    batchSize: input.env.CLEANUP_BATCH_SIZE,
    dryRun: input.dryRun,
  });
}

if (process.argv[1]?.endsWith("cleanup-expired-sessions.ts")) {
  runCleanupCli({ args: process.argv.slice(2) }).catch(() => {
    console.error(
      formatCleanupErrorLog({ timestamp: new Date().toISOString() }),
    );
    process.exitCode = 1;
  });
}
