import { createSupabaseAdminClient } from "@/lib/supabase-admin";

import type { VectorTraceSource } from "./query-runner";

type SupabaseSessionSourceClient = ReturnType<typeof createSupabaseAdminClient>;
type SupabaseSessionSourceClientFactory = () => SupabaseSessionSourceClient;

export function createSupabaseSessionSourceRepository(
  clientFactory: SupabaseSessionSourceClientFactory = createSupabaseAdminClient,
) {
  return {
    async loadActiveUploadSource(input: {
      sessionId: string;
      now: string;
    }): Promise<VectorTraceSource | null> {
      const client = clientFactory();
      const { data: session, error: sessionError } = await client
        .from("rag_sessions")
        .select("id")
        .eq("id", input.sessionId)
        .eq("status", "active")
        .gt("expires_at", input.now)
        .maybeSingle();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session) {
        return null;
      }

      const { data: documents, error: documentError } = await client
        .from("rag_documents")
        .select("id, file_name, extracted_text")
        .eq("session_id", input.sessionId)
        .eq("source_kind", "upload")
        .eq("status", "ready")
        .gt("expires_at", input.now)
        .order("created_at", { ascending: true });

      if (documentError) {
        throw new Error(documentError.message);
      }

      const { count, error: chunkError } = await client
        .from("rag_document_chunks")
        .select("id", { count: "exact", head: true })
        .eq("session_id", input.sessionId)
        .gt("expires_at", input.now);

      if (chunkError) {
        throw new Error(chunkError.message);
      }

      const readyDocuments = documents ?? [];

      return {
        slug: "session-uploads",
        title: "Uploaded documents",
        sourceKind: "upload",
        documentCount: readyDocuments.length,
        totalChunks: count ?? 0,
        documents: readyDocuments.map((document) => ({
          documentId: document.id,
          fileName: document.file_name,
          characterCount: String(document.extracted_text ?? "").length,
        })),
      };
    },
  };
}
