import { describe, expect, test } from "bun:test";

import { getOpenRouterEnvFrom } from "./env";

describe("getOpenRouterEnvFrom", () => {
  test("parses OpenRouter env without requiring Supabase or Perplexity secrets", () => {
    const env = getOpenRouterEnvFrom({
      OPENROUTER_API_KEY: "or-test-key",
      OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
      OPENROUTER_CHAT_MODEL: "deepseek/deepseek-v4-flash",
      OPENROUTER_HTTP_REFERER: "http://localhost:3000",
      OPENROUTER_APP_TITLE: "RAG Lens",
      OPENROUTER_TEMPERATURE: "0.2",
      OPENROUTER_MAX_COMPLETION_TOKENS: "900",
      OPENROUTER_REASONING_EFFORT: "none",
      OPENROUTER_REASONING_EXCLUDE: "true",
    });

    expect(env).toMatchObject({
      apiKey: "or-test-key",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "deepseek/deepseek-v4-flash",
      httpReferer: "http://localhost:3000",
      appTitle: "RAG Lens",
      temperature: 0.2,
      maxCompletionTokens: 900,
      reasoningEffort: "none",
      reasoningExclude: true,
    });
  });
});
