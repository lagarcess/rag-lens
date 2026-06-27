export interface UploadCleanupRepository {
  markAnonymousSessionDeleted(input: {
    now: string;
    sessionId: string;
  }): Promise<boolean>;
  listSessionStoragePaths(input: { sessionId: string }): Promise<string[]>;
  listPurgeableStoragePaths(input: {
    now: string;
    batchSize: number;
  }): Promise<string[]>;
  deleteExpiredRows(input: {
    now: string;
    storagePaths: string[];
  }): Promise<unknown>;
  deleteDeletedSessionRows(input: {
    now: string;
    sessionId: string;
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

export interface AnonymousSessionPurgeResult {
  ok: true;
  sessionId: string;
  purgeStatus: "completed";
  purgeRetryScheduled: false;
  storageObjects: number;
  removedStorageObjects: number;
  deletedRows: unknown;
}

export class AnonymousSessionPurgeError extends Error {
  constructor(
    readonly stage: "list-storage" | "remove-storage" | "delete-rows",
    cause: unknown,
  ) {
    super("Anonymous session was marked deleted, but cleanup could not finish.");
    this.name = "AnonymousSessionPurgeError";
    this.cause = cause;
  }
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

export async function purgeAnonymousSessionNow(input: {
  repository: UploadCleanupRepository;
  storage: UploadCleanupStorage;
  bucket: string;
  now: string;
  sessionId: string;
}): Promise<AnonymousSessionPurgeResult | null> {
  const marked = await input.repository.markAnonymousSessionDeleted({
    now: input.now,
    sessionId: input.sessionId,
  });

  if (!marked) {
    return null;
  }

  let storagePaths: string[];

  try {
    storagePaths = await input.repository.listSessionStoragePaths({
      sessionId: input.sessionId,
    });
  } catch (error) {
    throw new AnonymousSessionPurgeError("list-storage", error);
  }

  try {
    if (storagePaths.length > 0) {
      await input.storage.remove({
        bucket: input.bucket,
        paths: storagePaths,
      });
    }
  } catch (error) {
    throw new AnonymousSessionPurgeError("remove-storage", error);
  }

  let deletedRows: unknown;

  try {
    deletedRows = await input.repository.deleteDeletedSessionRows({
      now: input.now,
      sessionId: input.sessionId,
      storagePaths,
    });
  } catch (error) {
    throw new AnonymousSessionPurgeError("delete-rows", error);
  }

  return {
    ok: true,
    sessionId: input.sessionId,
    purgeStatus: "completed",
    purgeRetryScheduled: false,
    storageObjects: storagePaths.length,
    removedStorageObjects: storagePaths.length,
    deletedRows,
  };
}
