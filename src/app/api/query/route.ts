import { z } from "zod";

import {
  getOpenRouterEnv,
  getPerplexityEmbeddingEnv,
  getRagRuntimeEnv,
  shouldUseOpenRouter,
} from "@/lib/env";
import { RAG_LIMITS } from "@/lib/rag-config";
import { generateOpenRouterAnswer } from "@/lib/rag/openrouter";
import { embedTextsWithPerplexity } from "@/lib/rag/perplexity-embeddings";
import { runExampleTrace } from "@/lib/rag/query-runner";
import { retrieveSupabaseVector } from "@/lib/rag/supabase-vector";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const queryRequestSchema = z.object({
  sessionId: z.string().uuid().nullable().default(null),
  corpusSlug: z.string().min(1),
  question: z.string().trim().min(1).max(2_000),
  topK: z.coerce.number().int().min(1).max(RAG_LIMITS.maxTopK),
  chunkSize: z.coerce.number().int().min(160).max(2_000),
  chunkOverlap: z.coerce.number().int().min(0).max(1_999),
  embeddingMode: z.enum(["standard", "contextualized"]).default("standard"),
});

export async function POST(request: Request) {
  const parsed = queryRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid query request",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const runtimeEnv = getRagRuntimeEnv();

    if (
      runtimeEnv.retrievalBackend === "supabase" &&
      !usesSeededExampleVectorProfile(parsed.data)
    ) {
      return Response.json(
        {
          error:
            "Supabase example retrieval currently uses the seeded standard vector profile.",
          details: {
            chunkSize: RAG_LIMITS.defaultChunkSize,
            chunkOverlap: RAG_LIMITS.defaultChunkOverlap,
            embeddingMode: "standard",
          },
        },
        { status: 400 },
      );
    }

    const perplexityEnv =
      runtimeEnv.retrievalBackend === "supabase"
        ? getPerplexityEmbeddingEnv()
        : null;

    const result = await runExampleTrace(parsed.data, {
      retrievalProvider:
        runtimeEnv.retrievalBackend === "supabase" && perplexityEnv
          ? (input) =>
              retrieveSupabaseVector({
                question: input.question,
                corpusSlug: input.corpusSlug,
                topK: input.topK,
                supabase: createSupabaseAdminClient(),
                queryEmbeddingModel: perplexityEnv.standardEmbeddingModel,
                queryEmbedding: async (question) => {
                  const [embedding] = await embedTextsWithPerplexity({
                    apiKey: perplexityEnv.apiKey,
                    model: perplexityEnv.standardEmbeddingModel,
                    input: [question],
                  });

                  return embedding;
                },
              })
          : undefined,
      answerProvider: shouldUseOpenRouter()
        ? (input) => generateOpenRouterAnswer(input, getOpenRouterEnv())
        : undefined,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to run RAG trace for this request",
      },
      { status: 404 },
    );
  }
}

function usesSeededExampleVectorProfile(request: {
  chunkSize: number;
  chunkOverlap: number;
  embeddingMode: string;
}) {
  return (
    request.chunkSize === RAG_LIMITS.defaultChunkSize &&
    request.chunkOverlap === RAG_LIMITS.defaultChunkOverlap &&
    request.embeddingMode === "standard"
  );
}
