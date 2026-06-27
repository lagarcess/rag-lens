import { z } from "zod";

import { RAG_LIMITS } from "@/lib/rag-config";
import { runExampleTrace } from "@/lib/rag/query-runner";

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
    const result = await runExampleTrace(parsed.data);
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
