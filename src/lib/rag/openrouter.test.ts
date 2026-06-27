import { describe, expect, test } from "bun:test";

import { generateOpenRouterAnswer } from "./openrouter";

describe("generateOpenRouterAnswer", () => {
  test("sends a chat completion request with reasoning excluded", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });

      return new Response(
        JSON.stringify({
          id: "gen-123",
          model: "deepseek/deepseek-v4-flash",
          choices: [
            {
              finish_reason: "stop",
              message: {
                role: "assistant",
                content: "RAG improves trust by grounding answers in retrieved context. [1]",
              },
            },
          ],
          usage: {
            prompt_tokens: 120,
            completion_tokens: 34,
            total_tokens: 154,
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    };

    const result = await generateOpenRouterAnswer(
      {
        question: "How does RAG improve trust?",
        prompt: "Answer using only context.",
        citationCount: 2,
      },
      {
        apiKey: "or-test-key",
        baseUrl: "https://openrouter.ai/api/v1",
        model: "deepseek/deepseek-v4-flash",
        httpReferer: "http://localhost:3000",
        appTitle: "RAG Lens",
        temperature: 0.2,
        maxCompletionTokens: 900,
        reasoningEffort: "none",
        reasoningExclude: true,
      },
      fetchFn,
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      "https://openrouter.ai/api/v1/chat/completions",
    );
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.headers).toMatchObject({
      Authorization: "Bearer or-test-key",
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "RAG Lens",
    });

    const body = JSON.parse(String(calls[0].init.body));
    expect(body).toMatchObject({
      model: "deepseek/deepseek-v4-flash",
      temperature: 0.2,
      max_completion_tokens: 900,
      reasoning: {
        effort: "none",
        exclude: true,
      },
    });
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].content).toContain("Answer using only context.");

    expect(result).toMatchObject({
      answer: "RAG improves trust by grounding answers in retrieved context. [1]",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      finishReason: "stop",
      usage: {
        promptTokens: 120,
        completionTokens: 34,
        totalTokens: 154,
      },
    });
  });
});
