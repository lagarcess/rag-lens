import { createSupabaseTracePersistenceRepository } from "@/lib/rag/supabase-trace-store";
import {
  loadSessionTrace,
  TracePersistenceError,
} from "@/lib/rag/trace-persistence";

type SessionTraceRouteContext = {
  params: Promise<{
    sessionId: string;
    queryId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: SessionTraceRouteContext,
) {
  const { sessionId, queryId } = await context.params;

  try {
    const trace = await loadSessionTrace({
      repository: createSupabaseTracePersistenceRepository(),
      sessionId,
      queryId,
      now: new Date().toISOString(),
    });

    return Response.json(trace);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load trace",
      },
      { status: error instanceof TracePersistenceError ? error.statusCode : 500 },
    );
  }
}
