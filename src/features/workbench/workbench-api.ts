import type { RagQueryRequest, RagTraceResponse } from "@/lib/rag/trace";
import type { RagSourceCatalogResponse } from "@/lib/rag/source-catalog";
import type { TraceSummary } from "@/lib/rag/trace-persistence";

export interface WorkbenchSessionResponse {
  sessionId: string;
  expiresAt: string;
  hardExpiresAt: string;
}

export interface WorkbenchSessionHeartbeatResponse
  extends WorkbenchSessionResponse {
  ok: boolean;
}

export interface WorkbenchUploadResponse {
  documentId: string;
  sessionId: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  storagePath?: string;
  status: "pending" | "processing" | "ready" | "failed";
  extractedCharacters: number;
  expiresAt: string;
  hardExpiresAt: string;
}

export interface WorkbenchDeleteSessionResponse {
  ok: boolean;
  sessionId: string;
  purgeStatus: "completed" | "retry-pending";
  purgeRetryScheduled: boolean;
  warning?: string;
}

export interface WorkbenchTraceHistoryResponse {
  traces: TraceSummary[];
}

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

export async function listWorkbenchSources(
  fetchFn: FetchFn = fetch,
): Promise<RagSourceCatalogResponse["sources"]> {
  const response = await fetchFn("/api/corpora", {
    method: "GET",
  });

  if (!response.ok) {
    const payload = await readJsonSafely(response);
    throw new Error(payload?.error ?? "Unable to load source catalog");
  }

  const payload = (await response.json()) as RagSourceCatalogResponse;
  return payload.sources;
}

export async function createAnonymousSession(
  fetchFn: FetchFn = fetch,
): Promise<WorkbenchSessionResponse> {
  const response = await fetchFn("/api/sessions", {
    method: "POST",
  });

  if (!response.ok) {
    const payload = await readJsonSafely(response);
    throw new Error(payload?.error ?? "Unable to create session");
  }

  return (await response.json()) as WorkbenchSessionResponse;
}

export async function heartbeatAnonymousSession(
  sessionId: string,
  fetchFn: FetchFn = fetch,
): Promise<WorkbenchSessionHeartbeatResponse> {
  const response = await fetchFn(`/api/sessions/${sessionId}/heartbeat`, {
    method: "POST",
  });

  if (!response.ok) {
    const payload = await readJsonSafely(response);
    throw new Error(payload?.error ?? "Unable to refresh session");
  }

  return (await response.json()) as WorkbenchSessionHeartbeatResponse;
}

export async function uploadDocument(
  input: {
    sessionId: string;
    file: File;
  },
  fetchFn: FetchFn = fetch,
): Promise<WorkbenchUploadResponse> {
  const formData = new FormData();
  formData.set("sessionId", input.sessionId);
  formData.set("file", input.file);

  const response = await fetchFn("/api/uploads", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = await readJsonSafely(response);
    throw new Error(payload?.error ?? "Unable to upload document");
  }

  return (await response.json()) as WorkbenchUploadResponse;
}

export async function deleteAnonymousSession(
  sessionId: string,
  fetchFn: FetchFn = fetch,
): Promise<WorkbenchDeleteSessionResponse> {
  const response = await fetchFn(`/api/sessions/${sessionId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const payload = await readJsonSafely(response);
    throw new Error(payload?.error ?? "Unable to delete session");
  }

  return (await response.json()) as WorkbenchDeleteSessionResponse;
}

export async function listSessionTraces(
  sessionId: string,
  fetchFn: FetchFn = fetch,
): Promise<WorkbenchTraceHistoryResponse> {
  const response = await fetchFn(`/api/sessions/${sessionId}/traces`, {
    method: "GET",
  });

  if (!response.ok) {
    const payload = await readJsonSafely(response);
    throw new Error(payload?.error ?? "Unable to list trace history");
  }

  return (await response.json()) as WorkbenchTraceHistoryResponse;
}

export async function loadSessionTrace(
  input: {
    sessionId: string;
    queryId: string;
  },
  fetchFn: FetchFn = fetch,
): Promise<RagTraceResponse> {
  const response = await fetchFn(
    `/api/sessions/${input.sessionId}/traces/${input.queryId}`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    const payload = await readJsonSafely(response);
    throw new Error(payload?.error ?? "Unable to load trace");
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
