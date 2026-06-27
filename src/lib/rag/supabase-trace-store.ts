import { createSupabaseAdminClient } from "@/lib/supabase-admin";

import {
  TracePersistenceError,
  type PersistTraceQueryInsert,
  type PersistTraceRetrievalInsert,
  type TracePersistenceRepository,
} from "./trace-persistence";
import type { RagTrace } from "./trace";

type SupabaseTraceClient = ReturnType<typeof createSupabaseAdminClient>;
type SupabaseTraceClientFactory = () => SupabaseTraceClient;

export function createSupabaseTracePersistenceRepository(
  clientFactory: SupabaseTraceClientFactory = createSupabaseAdminClient,
): TracePersistenceRepository {
  return {
    async findActiveSession({ sessionId, now }) {
      const { data, error } = await clientFactory()
        .from("rag_sessions")
        .select("id, expires_at, hard_expires_at")
        .eq("id", sessionId)
        .eq("status", "active")
        .gt("expires_at", now)
        .maybeSingle();

      if (error) {
        throw new TracePersistenceError(
          "Unable to validate trace session",
          500,
        );
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        expiresAt: data.expires_at,
        hardExpiresAt: data.hard_expires_at,
      };
    },

    async insertQuery(row: PersistTraceQueryInsert) {
      const { error } = await clientFactory().from("rag_queries").insert({
        ...row,
        trace: row.trace,
      });

      if (error) {
        throw new TracePersistenceError("Unable to save trace query", 500);
      }
    },

    async insertRetrievals(rows: PersistTraceRetrievalInsert[]) {
      if (rows.length === 0) {
        return;
      }

      const { error } = await clientFactory().from("rag_retrievals").insert(rows);

      if (error) {
        throw new TracePersistenceError("Unable to save trace retrievals", 500);
      }
    },

    async deleteQuery(queryId: string) {
      const { error } = await clientFactory()
        .from("rag_queries")
        .delete()
        .eq("id", queryId);

      if (error) {
        throw new TracePersistenceError("Unable to roll back trace query", 500);
      }
    },

    async listRecentQueries({ sessionId, now, limit }) {
      const { data, error } = await clientFactory()
        .from("rag_queries")
        .select("id, question, answer, trace, created_at")
        .eq("session_id", sessionId)
        .gt("expires_at", now)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw new TracePersistenceError("Unable to list trace history", 500);
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        question: row.question,
        answer: row.answer,
        trace: row.trace as RagTrace,
        created_at: row.created_at,
      }));
    },

    async loadQueryTrace({ sessionId, queryId, now }) {
      const { data, error } = await clientFactory()
        .from("rag_queries")
        .select("id, answer, trace")
        .eq("id", queryId)
        .eq("session_id", sessionId)
        .gt("expires_at", now)
        .maybeSingle();

      if (error) {
        throw new TracePersistenceError("Unable to load trace", 500);
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        answer: data.answer,
        trace: data.trace as RagTrace,
      };
    },
  };
}
