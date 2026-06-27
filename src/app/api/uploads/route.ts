import { RAG_LIMITS } from "@/lib/rag-config";
import { getPerplexityEmbeddingEnv } from "@/lib/env";
import { embedTextsWithPerplexity } from "@/lib/rag/perplexity-embeddings";
import { createSupabaseUploadIngestionRepository } from "@/lib/rag/supabase-upload-ingestion-store";
import { ingestUploadedDocument } from "@/lib/rag/upload-ingestion";
import {
  createSupabaseUploadRepository,
  createSupabaseUploadStorage,
  getUploadBucket,
} from "@/lib/uploads/supabase-upload-store";
import {
  UploadError,
  uploadDocumentFromFormData,
} from "@/lib/uploads/upload-service";

export const runtime = "nodejs";

const MAX_UPLOAD_REQUEST_BYTES = RAG_LIMITS.maxAnonymousBytes + 1024 * 1024;

export async function POST(request: Request) {
  try {
    if (isOversizedUploadRequest(request)) {
      return Response.json(
        { error: "Upload request is too large." },
        { status: 413 },
      );
    }

    const result = await uploadDocumentFromFormData({
      formData: await request.formData(),
      repository: createSupabaseUploadRepository(),
      storage: createSupabaseUploadStorage(),
      bucket: getUploadBucket(),
      ingestor: async (document) => {
        const perplexityEnv = getPerplexityEmbeddingEnv();

        await ingestUploadedDocument({
          document,
          repository: createSupabaseUploadIngestionRepository(),
          embeddingModel: perplexityEnv.standardEmbeddingModel,
          embedTexts: (texts) =>
            embedTextsWithPerplexity({
              apiKey: perplexityEnv.apiKey,
              model: perplexityEnv.standardEmbeddingModel,
              input: texts,
            }),
        });
      },
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof UploadError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json({ error: "Unable to upload document" }, { status: 500 });
  }
}

function isOversizedUploadRequest(request: Request) {
  const contentLength = request.headers.get("content-length");

  if (!contentLength) {
    return false;
  }

  const parsed = Number(contentLength);
  return Number.isFinite(parsed) && parsed > MAX_UPLOAD_REQUEST_BYTES;
}
