import { createSupabaseAdminClient } from "@/lib/supabase-admin";

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
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("rag_sessions")
    .update({
      status: "deleted",
      deleted_at: now,
      last_seen_at: now,
    })
    .eq("id", sessionId)
    .select("id")
    .maybeSingle();

  if (error) {
    return Response.json({ error: "Unable to delete session" }, { status: 500 });
  }

  if (!data) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  return Response.json({ ok: true, sessionId });
}
