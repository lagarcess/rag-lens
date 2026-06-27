import type { RagQueryRequest, RagTraceResponse } from "@/lib/rag/trace";

type FetchFn = (
  url: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export async function runTraceQuery(
  input: RagQueryRequest,
  fetchFn: FetchFn = fetch,
): Promise<RagTraceResponse> {
  const response = await fetchFn("/api/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = await readJsonSafely(response);
    throw new Error(payload?.error ?? "Unable to run trace");
  }

  return (await response.json()) as RagTraceResponse;
}

async function readJsonSafely(response: Response) {
  try {
    return (await response.json()) as { error?: string };
  } catch {
    return null;
  }
}
