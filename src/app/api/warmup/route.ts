const WARMUP_ALLOWED_ORIGIN_KEYS = [
  "NEXT_PUBLIC_LANDING_ORIGIN",
  "NEXT_PUBLIC_SITE_URL",
] as const;

export const dynamic = "force-dynamic";

type WarmupMetadata = {
  ok: true;
  service: "rag-lens";
  purpose: "render-warmup";
  timestamp: string;
  workbenchPath: "/workbench";
};

export function GET(request: Request) {
  return Response.json(createWarmupMetadata(), {
    headers: createWarmupHeaders(request),
  });
}

export function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: createWarmupHeaders(request, true),
  });
}

function createWarmupMetadata(): WarmupMetadata {
  return {
    ok: true,
    service: "rag-lens",
    purpose: "render-warmup",
    timestamp: new Date().toISOString(),
    workbenchPath: "/workbench",
  };
}

function createWarmupHeaders(request: Request, includePreflight = false) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    Vary: "Origin",
  });
  const requestOrigin = request.headers.get("origin");

  if (requestOrigin && getConfiguredWarmupOrigins().has(requestOrigin)) {
    headers.set("Access-Control-Allow-Origin", requestOrigin);
  }

  if (includePreflight) {
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Max-Age", "600");
  }

  return headers;
}

function getConfiguredWarmupOrigins() {
  const origins = new Set<string>();

  for (const key of WARMUP_ALLOWED_ORIGIN_KEYS) {
    const origin = normalizeOrigin(process.env[key]);

    if (origin) {
      origins.add(origin);
    }
  }

  for (const value of splitOriginList(process.env.NEXT_PUBLIC_WARMUP_ALLOWED_ORIGINS)) {
    const origin = normalizeOrigin(value);

    if (origin) {
      origins.add(origin);
    }
  }

  return origins;
}

function splitOriginList(value: string | undefined) {
  return value?.split(",").map((entry) => entry.trim()).filter(Boolean) ?? [];
}

function normalizeOrigin(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
