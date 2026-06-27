export interface EdgeCleanupAdapter {
  listPurgeableStoragePaths(input: {
    now: string;
    batchSize: number;
  }): Promise<string[]>;
  removeStoragePaths(input: { bucket: string; paths: string[] }): Promise<void>;
  deleteExpiredRows(input: {
    now: string;
    storagePaths: string[];
  }): Promise<unknown>;
}

export interface EdgeCleanupResult {
  ok: true;
  dryRun: boolean;
  purgeableStorageObjects: number;
  removedStorageObjects: number;
  deletedRows: unknown | null;
  timestamp: string;
}

export function authorizeCleanupRequest(input: {
  authorization: string | null;
  cleanupToken: string;
}) {
  return input.authorization === `Bearer ${input.cleanupToken}`;
}

export function parseCleanupBatchSize(raw: string | undefined) {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 100;
}

export async function cleanupExpiredUploadsForEdge(input: {
  adapter: EdgeCleanupAdapter;
  bucket: string;
  now: string;
  batchSize: number;
  dryRun: boolean;
}): Promise<EdgeCleanupResult> {
  const storagePaths = await input.adapter.listPurgeableStoragePaths({
    now: input.now,
    batchSize: input.batchSize,
  });

  if (!input.dryRun && storagePaths.length > 0) {
    await input.adapter.removeStoragePaths({
      bucket: input.bucket,
      paths: storagePaths,
    });
  }

  const deletedRows = input.dryRun
    ? null
    : await input.adapter.deleteExpiredRows({
        now: input.now,
        storagePaths,
      });

  return {
    ok: true,
    dryRun: input.dryRun,
    purgeableStorageObjects: storagePaths.length,
    removedStorageObjects: input.dryRun ? 0 : storagePaths.length,
    deletedRows,
    timestamp: input.now,
  };
}
