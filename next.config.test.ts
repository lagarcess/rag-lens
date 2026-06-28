import { describe, expect, test } from "bun:test";

import nextConfig from "./next.config";

describe("next.config", () => {
  test("keeps pdf-parse external to the production server bundle", () => {
    expect(nextConfig.serverExternalPackages).toContain("pdf-parse");
  });
});
