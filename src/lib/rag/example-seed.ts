import { Buffer } from "node:buffer";

import { RAG_LIMITS } from "@/lib/rag-config";
import { toPgVector } from "@/lib/embeddings";
import type { SupabaseClient } from "@supabase/supabase-js";

import { chunkText } from "./chunk";
import { loadExampleCorpus } from "./example-corpora";
import { embedTextsWithPerplexity } from "./perplexity-embeddings";
import type { EmbeddingMode, RagChunk } from "./trace";

interface BuildExampleChunkInsertRowsInput {
  documentId: string;
  corpusSlug: string;
  chunks: RagChunk[];
  embeddings: number[][];
  embeddingModel: string;
  embeddingMode: EmbeddingMode;
}

export function buildExampleChunkInsertRows(
  input: BuildExampleChunkInsertRowsInput,
) {
  if (input.chunks.length !== input.embeddings.length) {
    throw new Error("Chunk count must match embedding count");
  }

  return input.chunks.map((chunk, index) => ({
    document_id: input.documentId,
    session_id: null,
    corpus_slug: input.corpusSlug,
    chunk_index: chunk.chunkIndex,
    content: chunk.content,
    char_start: chunk.charStart,
    char_end: chunk.charEnd,
    embedding_model: input.embeddingModel,
    embedding_mode: input.embeddingMode,
    embedding: toPgVector(input.embeddings[index]),
    metadata: {
      charStart: chunk.charStart,
      charEnd: chunk.charEnd,
      localChunkId: chunk.chunkId,
    },
    expires_at: null,
    hard_expires_at: null,
  }));
}

interface SeedExampleCorpusInput {
  corpusSlug: string;
  supabase: ExampleSeedSupabaseClient;
  perplexity: {
    apiKey: string;
    standardEmbeddingModel: string;
  };
}

export async function seedExampleCorpus(input: SeedExampleCorpusInput) {
  const corpus = await loadExampleCorpus(input.corpusSlug);
  let insertedDocuments = 0;
  let insertedChunks = 0;

  for (const document of corpus.documents) {
    const { error: deleteError } = await input.supabase
      .from("rag_documents")
      .delete()
      .eq("source_kind", "example")
      .eq("corpus_slug", corpus.slug)
      .eq("file_name", document.fileName);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const { data: insertedDocument, error: documentError } =
      await input.supabase
        .from("rag_documents")
        .insert({
          session_id: null,
          corpus_slug: corpus.slug,
          source_kind: "example",
          file_name: document.fileName,
          mime_type: "text/markdown",
          byte_size: Buffer.byteLength(document.content, "utf8"),
          status: "ready",
          extracted_text: document.content,
          expires_at: null,
          hard_expires_at: null,
        })
        .select("id")
        .single();

    if (documentError || !insertedDocument) {
      throw new Error(documentError?.message ?? "Document insert failed");
    }

    insertedDocuments += 1;

    const chunks = chunkText(document, {
      chunkSize: RAG_LIMITS.defaultChunkSize,
      chunkOverlap: RAG_LIMITS.defaultChunkOverlap,
    });
    const embeddings = await embedTextsWithPerplexity({
      apiKey: input.perplexity.apiKey,
      model: input.perplexity.standardEmbeddingModel,
      input: chunks.map((chunk) => chunk.content),
    });

    const { error: chunkError } = await input.supabase
      .from("rag_document_chunks")
      .insert(
        buildExampleChunkInsertRows({
          documentId: insertedDocument.id,
          corpusSlug: corpus.slug,
          chunks,
          embeddings,
          embeddingModel: input.perplexity.standardEmbeddingModel,
          embeddingMode: "standard",
        }),
      );

    if (chunkError) {
      throw new Error(chunkError.message);
    }

    insertedChunks += chunks.length;
  }

  return {
    corpusSlug: corpus.slug,
    insertedDocuments,
    insertedChunks,
  };
}

type ExampleSeedSupabaseClient = SupabaseClient;
