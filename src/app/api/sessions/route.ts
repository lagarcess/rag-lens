import { createSessionTimestamps } from "@/lib/rag-retention";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST() {
  const supabase = createSupabaseAdminClient();
  const timestamps = createSessionTimestamps();

  const { data, error } = await supabase
    .from("rag_sessions")
    .insert({
      mode: "anonymous",
      status: "active",
      created_at: timestamps.createdAt,
      last_seen_at: timestamps.createdAt,
      expires_at: timestamps.expiresAt,
      hard_expires_at: timestamps.hardExpiresAt,
    })
    .select("id, expires_at, hard_expires_at")
    .single();

  if (error) {
    return Response.json(
      { error: "Unable to create anonymous session" },
      { status: 500 },
    );
  }

  return Response.json({
    sessionId: data.id,
    expiresAt: data.expires_at,
    hardExpiresAt: data.hard_expires_at,
  });
}
