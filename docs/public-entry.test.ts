import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

const docsDir = join(process.cwd(), "docs");
const publicEntryPath = join(docsDir, "index.html");

describe("GitHub Pages public entry", () => {
  test("ships a static portfolio entry for GitHub Pages", () => {
    expect(existsSync(publicEntryPath)).toBe(true);

    const html = readFileSync(publicEntryPath, "utf8");

    expect(html).toContain("<title>RAG Lens");
    expect(html).toContain("Inspect, debug, and understand a real RAG app");
    expect(html).toContain("assets/screenshots/workbench.png");
    expect(html).toContain(
      'const RENDER_ORIGIN = "https://rag-lens-mx20.onrender.com";',
    );
    expect(html).toContain("/api/warmup");
    expect(html).toContain("/workbench");
    expect(html).toContain("rag-lens-render-warmup-at");
    expect(html).toContain("localStorage");
    expect(html).toContain("LOCAL_PREVIEW_HOSTS");
    expect(html).toContain("isLocalPreview()");
    expect(html).toContain("@media (prefers-color-scheme: dark)");
    expect(html).toContain("class=\"warmup-logo\"");
    expect(html).toContain("assets/brand/rag-lens-logo-light-mark.png");
    expect(html).toContain("assets/brand/rag-lens-logo-dark-mark.png");
  });

  test("does not expose provider or database secrets", () => {
    const html = existsSync(publicEntryPath)
      ? readFileSync(publicEntryPath, "utf8")
      : "";

    expect(html).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(html).not.toContain("PERPLEXITY_API_KEY");
    expect(html).not.toContain("OPENROUTER_API_KEY");
  });
});
