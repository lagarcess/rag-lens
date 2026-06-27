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
    if (error instanceof TracePersistenceError) {
      return Response.json(
        { error: "Trace not found or session expired." },
        { status: error.statusCode },
      );
    }

    return Response.json(
      { error: "Unable to load trace." },
      { status: 500 },
    );
  }
}
