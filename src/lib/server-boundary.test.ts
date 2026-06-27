import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assertServerRuntime } from "./server-runtime";

const repoRoot = process.cwd();

describe("server-only module boundaries", () => {
  test("secret-bearing modules assert the server runtime at module load", () => {
    expect(readSource("src/lib/env.ts")).toContain("assertServerRuntime();");
    expect(readSource("src/lib/supabase-admin.ts")).toContain(
      "assertServerRuntime();",
    );
  });

  test("server runtime assertion rejects browser execution", () => {
    const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "window",
    );

    try {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {},
      });

      expect(() => assertServerRuntime()).toThrow(
        "This module is server-only and cannot run in the browser.",
      );
    } finally {
      if (originalWindowDescriptor) {
        Object.defineProperty(globalThis, "window", originalWindowDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, "window");
      }
    }
  });
});

function readSource(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}
