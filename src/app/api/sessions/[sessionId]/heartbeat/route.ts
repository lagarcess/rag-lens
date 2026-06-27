import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type SessionHeartbeatContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function POST(
  _request: Request,
  context: SessionHeartbeatContext,
) {
  const { sessionId } = await context.params;
  const now = new Date().toISOString();
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("rag_sessions")
    .update({ last_seen_at: now })
    .eq("id", sessionId)
    .eq("status", "active")
    .gt("expires_at", now)
    .select("id, expires_at, hard_expires_at")
    .maybeSingle();

  if (error) {
    return Response.json({ error: "Unable to update session" }, { status: 500 });
  }

  if (!data) {
    return Response.json(
      { error: "Session not found or expired" },
      { status: 404 },
    );
  }

  return Response.json({
    ok: true,
    sessionId: data.id,
    expiresAt: data.expires_at,
    hardExpiresAt: data.hard_expires_at,
  });
}
