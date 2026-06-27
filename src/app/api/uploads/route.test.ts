import { describe, expect, test } from "bun:test";

import { POST } from "./route";

describe("POST /api/uploads", () => {
  test("rate limits before reading multipart form data", async () => {
    const previousLimit = process.env.RAG_RATE_LIMIT_UPLOAD_MAX;
    process.env.RAG_RATE_LIMIT_UPLOAD_MAX = "0";
    let formDataCalled = false;

    try {
      const response = await POST({
        headers: new Headers({
          "content-length": "100",
          "x-forwarded-for": "203.0.113.30",
        }),
        formData: async () => {
          formDataCalled = true;
          throw new Error("form data should not be parsed");
        },
      } as unknown as Request);

      expect(response.status).toBe(429);
      expect(response.headers.get("retry-after")).toBeTruthy();
      expect(formDataCalled).toBe(false);
      await expect(response.json()).resolves.toEqual({
        error: "Too many requests. Try again shortly.",
      });
    } finally {
      process.env.RAG_RATE_LIMIT_UPLOAD_MAX = previousLimit;
    }
  });

  test("rejects oversized multipart requests before parsing form data", async () => {
    let formDataCalled = false;
    const request = {
      headers: new Headers({
        "content-length": String(12 * 1024 * 1024),
      }),
      formData: async () => {
        formDataCalled = true;
        return new FormData();
      },
    } as unknown as Request;

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(formDataCalled).toBe(false);
    await expect(response.json()).resolves.toEqual({
      error: "Upload request is too large.",
    });
  });

  test("returns a sanitized 400 response for malformed upload form data", async () => {
    const formData = new FormData();
    formData.set("sessionId", "11111111-1111-4111-8111-111111111111");

    const response = await POST(
      new Request("http://localhost:3000/api/uploads", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Upload requires a file.",
    });
  });
});
