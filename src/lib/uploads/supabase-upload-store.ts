import { STORAGE } from "@/lib/rag-config";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

import type {
  UploadCleanupRepository,
  UploadCleanupStorage,
} from "./upload-cleanup";
import type {
  UploadDocumentInsert,
  UploadError,
  UploadRepository,
  UploadStorage,
} from "./upload-service";
import { UploadError as UploadRouteError } from "./upload-service";

type SupabaseUploadClient = ReturnType<typeof createSupabaseAdminClient>;
type SupabaseUploadClientFactory = () => SupabaseUploadClient;

export function getUploadBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET ?? STORAGE.uploadBucket;
}

export function createSupabaseUploadRepository(
  clientFactory: SupabaseUploadClientFactory = createSupabaseAdminClient,
): UploadRepository {
  return {
    async findActiveSession({ sessionId, now }) {
      const { data, error } = await clientFactory()
        .from("rag_sessions")
        .select("id, expires_at, hard_expires_at")
        .eq("id", sessionId)
        .eq("status", "active")
        .gt("expires_at", now)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        expiresAt: data.expires_at,
        hardExpiresAt: data.hard_expires_at,
      };
    },

    async createUploadDocument(row: UploadDocumentInsert) {
      const { data, error } = await clientFactory()
        .rpc("create_upload_document", {
          p_document_id: row.id,
          p_session_id: row.session_id,
          p_file_name: row.file_name,
          p_mime_type: row.mime_type,
          p_byte_size: row.byte_size,
          p_storage_path: row.storage_path,
          p_extracted_text: row.extracted_text,
          p_now: new Date().toISOString(),
        })
        .single();

      if (error) {
        throw mapUploadRpcError(error.message);
      }

      const created = data as { id: string };
      return { id: created.id };
    },

    async deleteUploadDocument(documentId: string) {
      const { error } = await clientFactory()
        .from("rag_documents")
        .delete()
        .eq("id", documentId)
        .eq("source_kind", "upload");

      if (error) {
        throw new Error(error.message);
      }
    },
  };
}

function mapUploadRpcError(message: string): UploadError | Error {
  if (message.includes("Session not found or expired")) {
    return new UploadRouteError("Session not found or expired.", 404);
  }

  if (message.includes("limited to")) {
    return new UploadRouteError(message, 400);
  }

  return new Error(message);
}

export function createSupabaseUploadStorage(
  clientFactory: SupabaseUploadClientFactory = createSupabaseAdminClient,
): UploadStorage & UploadCleanupStorage {
  return {
    async upload({ bucket, path, bytes, contentType }) {
      const { error } = await clientFactory()
        .storage.from(bucket)
        .upload(path, bytes, {
          contentType,
          upsert: false,
        });

      if (error) {
        throw new Error(error.message);
      }
    },

    async remove({ bucket, paths }) {
      const { error } = await clientFactory().storage.from(bucket).remove(paths);

      if (error) {
        throw new Error(error.message);
      }
    },
  };
}

export function createSupabaseUploadCleanupRepository(
  clientFactory: SupabaseUploadClientFactory = createSupabaseAdminClient,
): UploadCleanupRepository {
  return {
    async listPurgeableStoragePaths({ now, batchSize }) {
      const { data, error } = await clientFactory().rpc(
        "list_purgeable_rag_storage_paths",
        {
          p_now: now,
          p_limit: batchSize,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      const rows = (data ?? []) as Array<{ storage_path?: string | null }>;

      return rows
        .map((row) => row.storage_path)
        .filter((path: string | null | undefined): path is string =>
          Boolean(path),
        );
    },

    async deleteExpiredRows({ now }) {
      const { data, error } = await clientFactory().rpc(
        "delete_expired_rag_rows",
        {
          p_now: now,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  };
}
