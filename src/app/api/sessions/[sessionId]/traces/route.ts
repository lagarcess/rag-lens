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
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to list trace history",
      },
      { status: error instanceof TracePersistenceError ? error.statusCode : 500 },
    );
  }
}
