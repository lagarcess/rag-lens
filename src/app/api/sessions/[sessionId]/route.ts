import {
  AnonymousSessionPurgeError,
  purgeAnonymousSessionNow,
} from "@/lib/uploads/upload-cleanup";
import {
  createSupabaseUploadCleanupRepository,
  createSupabaseUploadStorage,
  getUploadBucket,
} from "@/lib/uploads/supabase-upload-store";

type SessionRouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function DELETE(
  _request: Request,
  context: SessionRouteContext,
) {
  const { sessionId } = await context.params;
  const now = new Date().toISOString();

  try {
    const result = await purgeAnonymousSessionNow({
      repository: createSupabaseUploadCleanupRepository(),
      storage: createSupabaseUploadStorage(),
      bucket: getUploadBucket(),
      now,
      sessionId,
    });

    if (!result) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    return Response.json(result);
  } catch (error) {
    if (error instanceof AnonymousSessionPurgeError) {
      console.warn("Anonymous session cleanup retry scheduled", {
        sessionId,
        stage: error.stage,
      });

      return Response.json(
        {
          ok: true,
          sessionId,
          purgeStatus: "retry-pending",
          purgeRetryScheduled: true,
          warning:
            "Session deleted. Immediate file cleanup could not be confirmed, so scheduled cleanup will retry during the monthly purge.",
        },
        { status: 202 },
      );
    }

    return Response.json({ error: "Unable to delete session" }, { status: 500 });
  }
}
