import { createSupabaseAdminClient } from "@/lib/supabase-admin";

import type { VectorTraceSource } from "./query-runner";
import type { RagChunk } from "./trace";

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

      const readyDocuments = documents ?? [];
      const documentFileNames = new Map(
        readyDocuments.map((document) => [document.id, document.file_name]),
      );
      const chunks =
        readyDocuments.length === 0
          ? []
          : await loadUploadChunks(client, {
              sessionId: input.sessionId,
              documentIds: readyDocuments.map((document) => document.id),
              now: input.now,
            });

      const sourceChunks = (chunks ?? []).map((chunk) =>
        mapUploadSourceChunk(chunk, documentFileNames),
      );

      return {
        slug: "session-uploads",
        title: "Uploaded documents",
        sourceKind: "upload",
        documentCount: readyDocuments.length,
        totalChunks: sourceChunks.length,
        chunks: sourceChunks,
        documents: readyDocuments.map((document) => ({
          documentId: document.id,
          fileName: document.file_name,
          characterCount: String(document.extracted_text ?? "").length,
        })),
      };
    },
  };
}

async function loadUploadChunks(
  client: SupabaseSessionSourceClient,
  input: {
    sessionId: string;
    documentIds: string[];
    now: string;
  },
) {
  const { data, error } = await client
    .from("rag_document_chunks")
    .select("id, document_id, chunk_index, content, char_start, char_end")
    .eq("session_id", input.sessionId)
    .in("document_id", input.documentIds)
    .gt("expires_at", input.now)
    .order("document_id", { ascending: true })
    .order("chunk_index", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

function mapUploadSourceChunk(
  chunk: {
    id: string;
    document_id: string;
    chunk_index: number;
    content: string;
    char_start: number | null;
    char_end: number | null;
  },
  documentFileNames: Map<string, string>,
): RagChunk {
  return {
    chunkId: chunk.id,
    documentId: chunk.document_id,
    fileName: documentFileNames.get(chunk.document_id) ?? "uploaded document",
    chunkIndex: chunk.chunk_index,
    charStart: chunk.char_start ?? 0,
    charEnd: chunk.char_end ?? chunk.content.length,
    content: chunk.content,
  };
}
