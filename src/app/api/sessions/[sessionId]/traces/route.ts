import { createSupabaseTracePersistenceRepository } from "@/lib/rag/supabase-trace-store";
import {
  listSessionTraceSummaries,
  TracePersistenceError,
} from "@/lib/rag/trace-persistence";

type SessionTracesRouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: SessionTracesRouteContext,
) {
  const { sessionId } = await context.params;

  try {
    const traces = await listSessionTraceSummaries({
      repository: createSupabaseTracePersistenceRepository(),
      sessionId,
      now: new Date().toISOString(),
      limit: 8,
    });

    return Response.json({ traces });
  } catch (error) {
    if (error instanceof TracePersistenceError) {
      return Response.json(
        { error: "Trace history is unavailable for this session." },
        { status: error.statusCode },
      );
    }

    return Response.json(
      { error: "Unable to list trace history." },
      { status: 500 },
    );
  }
}
