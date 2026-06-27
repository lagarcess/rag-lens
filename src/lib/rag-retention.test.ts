import { describe, expect, test } from "bun:test";

import { createSessionTimestamps } from "./rag-retention";

describe("createSessionTimestamps", () => {
  test("creates ordered soft and hard expiry timestamps", () => {
    const now = new Date("2026-06-27T10:00:00.000Z");

    const timestamps = createSessionTimestamps(now, {
      softTtlHours: 2,
      hardTtlHours: 24,
    });

    expect(timestamps).toEqual({
      createdAt: "2026-06-27T10:00:00.000Z",
      expiresAt: "2026-06-27T12:00:00.000Z",
      hardExpiresAt: "2026-06-28T10:00:00.000Z",
    });
  });
});
