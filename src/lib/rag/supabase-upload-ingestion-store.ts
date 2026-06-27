import { createSupabaseAdminClient } from "@/lib/supabase-admin";

import type {
  UploadChunkInsertRow,
  UploadIngestionRepository,
} from "./upload-ingestion";

type SupabaseUploadIngestionClient = ReturnType<
  typeof createSupabaseAdminClient
>;
type SupabaseUploadIngestionClientFactory = () => SupabaseUploadIngestionClient;

export function createSupabaseUploadIngestionRepository(
  clientFactory: SupabaseUploadIngestionClientFactory = createSupabaseAdminClient,
): UploadIngestionRepository {
  return {
    async replaceDocumentChunks({ documentId, rows }) {
      const client = clientFactory();
      const { error: deleteError } = await client
        .from("rag_document_chunks")
        .delete()
        .eq("document_id", documentId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      if (rows.length === 0) {
        return 0;
      }

      const { error: insertError } = await client
        .from("rag_document_chunks")
        .insert(rows satisfies UploadChunkInsertRow[]);

      if (insertError) {
        throw new Error(insertError.message);
      }

      return rows.length;
    },
  };
}
