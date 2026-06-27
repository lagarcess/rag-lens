import { describe, expect, test } from "bun:test";

import {
  checkPublicApiRateLimit,
  createPublicApiRateLimitStore,
  getPublicApiRateLimitKey,
} from "./public-api-rate-limit";

describe("public API rate limiting", () => {
  test("blocks requests after the configured window limit", () => {
    const store = createPublicApiRateLimitStore();
    const now = new Date("2026-06-27T12:00:00.000Z").getTime();
    const request = new Request("http://localhost:3000/api/query", {
      headers: {
        "x-forwarded-for": "203.0.113.9, 10.0.0.1",
        "user-agent": "rate-limit-test",
      },
    });

    expect(
      checkPublicApiRateLimit(request, "query", {
        limit: 2,
        now,
        store,
        windowMs: 60_000,
      }),
    ).toMatchObject({ allowed: true, remaining: 1 });
    expect(
      checkPublicApiRateLimit(request, "query", {
        limit: 2,
        now: now + 1,
        store,
        windowMs: 60_000,
      }),
    ).toMatchObject({ allowed: true, remaining: 0 });
    expect(
      checkPublicApiRateLimit(request, "query", {
        limit: 2,
        now: now + 2,
        store,
        windowMs: 60_000,
      }),
    ).toMatchObject({
      allowed: false,
      limit: 2,
      retryAfterSeconds: 60,
    });
  });

  test("uses the first forwarded IP and scope in the client key", () => {
    const request = new Request("http://localhost:3000/api/uploads", {
      headers: {
        "x-forwarded-for": "198.51.100.7, 10.0.0.1",
      },
    });

    expect(getPublicApiRateLimitKey(request, "upload")).toBe(
      "upload:198.51.100.7",
    );
  });
});
