export type PublicApiRateLimitScope = "query" | "session" | "upload";

export interface PublicApiRateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export type PublicApiRateLimitStore = Map<string, RateLimitRecord>;

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_LIMITS: Record<PublicApiRateLimitScope, number> = {
  query: 20,
  session: 10,
  upload: 6,
};

const globalStoreKey = "__ragLensPublicApiRateLimitStore";

export function createPublicApiRateLimitStore(): PublicApiRateLimitStore {
  return new Map();
}

export function getPublicApiRateLimitKey(
  request: Request,
  scope: PublicApiRateLimitScope,
) {
  return `${scope}:${getClientAddress(request.headers)}`;
}

export function checkPublicApiRateLimit(
  request: Request,
  scope: PublicApiRateLimitScope,
  options: {
    limit?: number;
    now?: number;
    store?: PublicApiRateLimitStore;
    windowMs?: number;
  } = {},
): PublicApiRateLimitDecision {
  const limit = options.limit ?? getLimitForScope(scope);
  const windowMs = options.windowMs ?? getWindowMs();
  const now = options.now ?? Date.now();
  const store = options.store ?? getGlobalStore();
  const key = getPublicApiRateLimitKey(request, scope);
  const existing = store.get(key);

  if (limit <= 0) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
    };
  }

  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;

  return {
    allowed: true,
    limit,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

export function createPublicApiRateLimitResponse(
  decision: PublicApiRateLimitDecision,
) {
  return Response.json(
    { error: "Too many requests. Try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(decision.retryAfterSeconds),
        "X-RateLimit-Limit": String(decision.limit),
        "X-RateLimit-Remaining": String(decision.remaining),
      },
    },
  );
}

export function getPublicApiRateLimitResponse(
  request: Request,
  scope: PublicApiRateLimitScope,
) {
  const decision = checkPublicApiRateLimit(request, scope);

  return decision.allowed ? null : createPublicApiRateLimitResponse(decision);
}

function getGlobalStore() {
  const globalWithStore = globalThis as typeof globalThis & {
    [globalStoreKey]?: PublicApiRateLimitStore;
  };

  globalWithStore[globalStoreKey] ??= createPublicApiRateLimitStore();

  return globalWithStore[globalStoreKey];
}

function getClientAddress(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");

  if (forwardedFor) {
    return sanitizeClientAddress(forwardedFor.split(",")[0]);
  }

  return sanitizeClientAddress(
    headers.get("cf-connecting-ip") ??
      headers.get("x-real-ip") ??
      headers.get("user-agent") ??
      "unknown",
  );
}

function sanitizeClientAddress(value: string) {
  return value.trim().slice(0, 96) || "unknown";
}

function getLimitForScope(scope: PublicApiRateLimitScope) {
  const envKey = {
    query: "RAG_RATE_LIMIT_QUERY_MAX",
    session: "RAG_RATE_LIMIT_SESSION_MAX",
    upload: "RAG_RATE_LIMIT_UPLOAD_MAX",
  } satisfies Record<PublicApiRateLimitScope, string>;

  return parseNonNegativeInteger(
    process.env[envKey[scope]],
    DEFAULT_LIMITS[scope],
  );
}

function getWindowMs() {
  return parseNonNegativeInteger(
    process.env.RAG_RATE_LIMIT_WINDOW_MS,
    DEFAULT_WINDOW_MS,
  );
}

function parseNonNegativeInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}
