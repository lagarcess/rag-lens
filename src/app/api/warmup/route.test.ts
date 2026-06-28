import { describe, expect, test } from "bun:test";

import { GET, OPTIONS } from "./route";

describe("GET /api/warmup", () => {
  test("returns cheap warmup metadata without provider setup", async () => {
    const response = await GET(new Request("http://localhost:3000/api/warmup"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      service: "rag-lens",
      purpose: "render-warmup",
      workbenchPath: "/workbench",
    });
  });

  test("sets CORS only for a configured public landing origin", async () => {
    const previousLandingOrigin = process.env.NEXT_PUBLIC_LANDING_ORIGIN;
    const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_LANDING_ORIGIN = "https://lagarcess.github.io";
    process.env.NEXT_PUBLIC_SITE_URL = "https://rag-lens.onrender.com";

    try {
      const allowedResponse = await GET(
        new Request("https://rag-lens.onrender.com/api/warmup", {
          headers: {
            origin: "https://lagarcess.github.io",
          },
        }),
      );
      const deniedResponse = await GET(
        new Request("https://rag-lens.onrender.com/api/warmup", {
          headers: {
            origin: "https://example.com",
          },
        }),
      );

      expect(allowedResponse.headers.get("access-control-allow-origin")).toBe(
        "https://lagarcess.github.io",
      );
      expect(allowedResponse.headers.get("vary")).toBe("Origin");
      expect(deniedResponse.headers.get("access-control-allow-origin")).toBeNull();
    } finally {
      process.env.NEXT_PUBLIC_LANDING_ORIGIN = previousLandingOrigin;
      process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    }
  });
});

describe("OPTIONS /api/warmup", () => {
  test("answers preflight for the configured landing origin", async () => {
    const previousLandingOrigin = process.env.NEXT_PUBLIC_LANDING_ORIGIN;
    process.env.NEXT_PUBLIC_LANDING_ORIGIN = "https://lagarcess.github.io";

    try {
      const response = await OPTIONS(
        new Request("https://rag-lens.onrender.com/api/warmup", {
          method: "OPTIONS",
          headers: {
            origin: "https://lagarcess.github.io",
          },
        }),
      );

      expect(response.status).toBe(204);
      expect(response.headers.get("access-control-allow-origin")).toBe(
        "https://lagarcess.github.io",
      );
      expect(response.headers.get("access-control-allow-methods")).toBe(
        "GET, OPTIONS",
      );
    } finally {
      process.env.NEXT_PUBLIC_LANDING_ORIGIN = previousLandingOrigin;
    }
  });
});
