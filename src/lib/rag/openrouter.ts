import type { AnswerProviderResult } from "./query-runner";

export interface OpenRouterEnv {
  apiKey: string;
  baseUrl: string;
  model: string;
  httpReferer?: string;
  appTitle: string;
  temperature: number;
  maxCompletionTokens: number;
  reasoningEffort: "none" | "low" | "medium" | "high";
  reasoningExclude: boolean;
}

interface OpenRouterAnswerInput {
  question: string;
  prompt: string;
  citationCount: number;
}

type FetchFn = (
  url: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export async function generateOpenRouterAnswer(
  input: OpenRouterAnswerInput,
  env: OpenRouterEnv,
  fetchFn: FetchFn = fetch,
): Promise<AnswerProviderResult> {
  const response = await fetchFn(
    `${env.baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.apiKey}`,
        "Content-Type": "application/json",
        ...(env.httpReferer ? { "HTTP-Referer": env.httpReferer } : {}),
        "X-Title": env.appTitle,
      },
      body: JSON.stringify({
        model: env.model,
        temperature: env.temperature,
        max_completion_tokens: env.maxCompletionTokens,
        reasoning: {
          effort: env.reasoningEffort,
          exclude: env.reasoningExclude,
        },
        messages: [
          {
            role: "system",
            content:
              "You are RAG Lens. Answer only from the retrieved context and use bracketed citation numbers when evidence supports a claim.",
          },
          {
            role: "user",
            content: [
              input.prompt,
              "",
              `Question: ${input.question}`,
              `Available citations: ${input.citationCount}`,
            ].join("\n"),
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`OpenRouter request failed with status ${response.status}`);
  }

  const json = (await response.json()) as OpenRouterResponse;
  const answer = json.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error("OpenRouter response did not include answer content");
  }

  return {
    answer,
    provider: "openrouter",
    model: json.model ?? env.model,
    finishReason: json.choices?.[0]?.finish_reason,
    usage: json.usage
      ? {
          promptTokens: json.usage.prompt_tokens,
          completionTokens: json.usage.completion_tokens,
          totalTokens: json.usage.total_tokens,
        }
      : undefined,
  };
}

interface OpenRouterResponse {
  model?: string;
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
