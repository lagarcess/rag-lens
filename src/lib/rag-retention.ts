import { RAG_LIMITS } from "@/lib/rag-config";

interface SessionTtlOptions {
  softTtlHours?: number;
  hardTtlHours?: number;
}

export function createSessionTimestamps(
  now = new Date(),
  options: SessionTtlOptions = {},
) {
  const softTtlHours = options.softTtlHours ?? RAG_LIMITS.softSessionTtlHours;
  const hardTtlHours = options.hardTtlHours ?? RAG_LIMITS.hardSessionTtlHours;

  return {
    createdAt: now.toISOString(),
    expiresAt: addHours(now, softTtlHours).toISOString(),
    hardExpiresAt: addHours(now, hardTtlHours).toISOString(),
  };
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}
