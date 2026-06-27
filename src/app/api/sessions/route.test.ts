import { describe, expect, test } from "bun:test";

import { POST } from "./route";

describe("POST /api/sessions", () => {
  test("rate limits before creating an anonymous session", async () => {
    const previousLimit = process.env.RAG_RATE_LIMIT_SESSION_MAX;
    const previousUrl = process.env.SUPABASE_URL;
    const previousServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.RAG_RATE_LIMIT_SESSION_MAX = "0";
    process.env.SUPABASE_URL = "not-a-url";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";

    try {
      const response = await POST(
        new Request("http://localhost:3000/api/sessions", {
          method: "POST",
          headers: {
            "x-forwarded-for": "203.0.113.40",
          },
        }),
      );

      expect(response.status).toBe(429);
      expect(response.headers.get("retry-after")).toBeTruthy();
      await expect(response.json()).resolves.toEqual({
        error: "Too many requests. Try again shortly.",
      });
    } finally {
      process.env.RAG_RATE_LIMIT_SESSION_MAX = previousLimit;
      process.env.SUPABASE_URL = previousUrl;
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRole;
    }
  });
});
