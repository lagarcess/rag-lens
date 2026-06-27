export interface UploadCleanupRepository {
  listPurgeableStoragePaths(input: {
    now: string;
    batchSize: number;
  }): Promise<string[]>;
  deleteExpiredRows(input: { now: string }): Promise<unknown>;
}

export interface UploadCleanupStorage {
  remove(input: { bucket: string; paths: string[] }): Promise<void>;
}

export async function cleanupExpiredUploads(input: {
  repository: UploadCleanupRepository;
  storage: UploadCleanupStorage;
  bucket: string;
  now: string;
  batchSize: number;
}) {
  const storagePaths = await input.repository.listPurgeableStoragePaths({
    now: input.now,
    batchSize: input.batchSize,
  });

  if (storagePaths.length > 0) {
    await input.storage.remove({
      bucket: input.bucket,
      paths: storagePaths,
    });
  }

  const deletedRows = await input.repository.deleteExpiredRows({
    now: input.now,
  });

  return {
    removedStorageObjects: storagePaths.length,
    deletedRows,
  };
}
