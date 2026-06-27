export interface UploadCleanupRepository {
  listPurgeableStoragePaths(input: {
    now: string;
    batchSize: number;
  }): Promise<string[]>;
  deleteExpiredRows(input: {
    now: string;
    storagePaths: string[];
  }): Promise<unknown>;
}

export interface UploadCleanupStorage {
  remove(input: { bucket: string; paths: string[] }): Promise<void>;
}

export interface UploadCleanupResult {
  dryRun: boolean;
  purgeableStorageObjects: number;
  removedStorageObjects: number;
  deletedRows: unknown | null;
}

export async function cleanupExpiredUploads(input: {
  repository: UploadCleanupRepository;
  storage: UploadCleanupStorage;
  bucket: string;
  now: string;
  batchSize: number;
  dryRun?: boolean;
}): Promise<UploadCleanupResult> {
  const storagePaths = await input.repository.listPurgeableStoragePaths({
    now: input.now,
    batchSize: input.batchSize,
  });
  const dryRun = input.dryRun ?? false;

  if (!dryRun && storagePaths.length > 0) {
    await input.storage.remove({
      bucket: input.bucket,
      paths: storagePaths,
    });
  }

  const deletedRows = dryRun
    ? null
    : await input.repository.deleteExpiredRows({
        now: input.now,
        storagePaths,
      });

  return {
    dryRun,
    purgeableStorageObjects: storagePaths.length,
    removedStorageObjects: dryRun ? 0 : storagePaths.length,
    deletedRows,
  };
}
