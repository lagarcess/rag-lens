import { describe, expect, test } from "bun:test";

import {
  buildRenderPath,
  shouldRunWarmup,
  WARMUP_COOLDOWN_MS,
} from "./warmup";

describe("landing warmup helpers", () => {
  test("builds same-origin paths when no Render origin is configured", () => {
    expect(buildRenderPath("/api/warmup", undefined, "https://pages.test")).toBe(
      "https://pages.test/api/warmup",
    );
  });

  test("builds Render-origin paths from the public site URL", () => {
    expect(
      buildRenderPath(
        "/workbench",
        "https://rag-lens.onrender.com/",
        "https://pages.test",
      ),
    ).toBe("https://rag-lens.onrender.com/workbench");
  });

  test("falls back to the current origin when the Render URL is invalid", () => {
    expect(buildRenderPath("/workbench", "not-a-url", "https://pages.test")).toBe(
      "https://pages.test/workbench",
    );
  });

  test("skips warmup inside the cooldown window", () => {
    expect(shouldRunWarmup(null, 1_000)).toBe(true);
    expect(shouldRunWarmup("not-a-number", 1_000)).toBe(true);
    expect(shouldRunWarmup(String(1_000 - WARMUP_COOLDOWN_MS), 1_000)).toBe(
      false,
    );
    expect(shouldRunWarmup(String(1_000 - WARMUP_COOLDOWN_MS - 1), 1_000)).toBe(
      true,
    );
  });
});
