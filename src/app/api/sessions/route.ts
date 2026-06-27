import { getRetentionEnv } from "@/lib/env";
import { getPublicApiRateLimitResponse } from "@/lib/public-api-rate-limit";
import { createSessionTimestamps } from "@/lib/rag-retention";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const rateLimitResponse = getPublicApiRateLimitResponse(request, "session");

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const supabase = createSupabaseAdminClient();
  const retention = getRetentionEnv();
  const timestamps = createSessionTimestamps(undefined, {
    softTtlHours: retention.softSessionTtlHours,
    hardTtlHours: retention.hardSessionTtlHours,
  });

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
