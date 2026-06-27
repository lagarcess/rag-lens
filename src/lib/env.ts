import { z } from "zod";

const booleanStringSchema = z
  .union([z.boolean(), z.string()])
  .transform((value) =>
    typeof value === "boolean" ? value : value.toLowerCase() === "true",
  );

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().default("rag-uploads"),
  PERPLEXITY_API_KEY: z.string().min(1),
  PERPLEXITY_EMBEDDING_MODEL: z.string().default("pplx-embed-v1-0.6b"),
  PERPLEXITY_CONTEXT_EMBEDDING_MODEL: z
    .string()
    .default("pplx-embed-context-v1-0.6b"),
  PERPLEXITY_CHAT_MODEL: z.string().default("sonar-pro"),
  CLEANUP_BATCH_SIZE: z.coerce.number().int().positive().default(100),
});

const supabaseAdminEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const cleanupEnvSchema = supabaseAdminEnvSchema.extend({
  SUPABASE_STORAGE_BUCKET: z.string().default("rag-uploads"),
  CLEANUP_BATCH_SIZE: z.coerce.number().int().positive().default(100),
});

const perplexityEmbeddingEnvSchema = z.object({
  PERPLEXITY_API_KEY: z.string().min(1),
  PERPLEXITY_EMBEDDING_MODEL: z.string().default("pplx-embed-v1-0.6b"),
  PERPLEXITY_CONTEXT_EMBEDDING_MODEL: z
    .string()
    .default("pplx-embed-context-v1-0.6b"),
});

const ragRuntimeEnvSchema = z.object({
  RAG_RETRIEVAL_BACKEND: z.enum(["local", "supabase"]).default("local"),
});

const openRouterEnvSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_BASE_URL: z
    .string()
    .url()
    .default("https://openrouter.ai/api/v1"),
  OPENROUTER_CHAT_MODEL: z.string().default("deepseek/deepseek-v4-flash"),
  OPENROUTER_HTTP_REFERER: z.string().url().optional(),
  OPENROUTER_APP_TITLE: z.string().default("RAG Lens"),
  OPENROUTER_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),
  OPENROUTER_MAX_COMPLETION_TOKENS: z.coerce
    .number()
    .int()
    .positive()
    .default(900),
  OPENROUTER_REASONING_EFFORT: z
    .enum(["none", "low", "medium", "high"])
    .default("none"),
  OPENROUTER_REASONING_EXCLUDE: booleanStringSchema.default(true),
});

export function getServerEnv() {
  return serverEnvSchema.parse(process.env);
}

export function getSupabaseAdminEnv() {
  return supabaseAdminEnvSchema.parse(process.env);
}

export function getCleanupEnv() {
  return getCleanupEnvFrom(process.env);
}

export function getCleanupEnvFrom(source: Record<string, string | undefined>) {
  return cleanupEnvSchema.parse(source);
}

export function getPerplexityEmbeddingEnv() {
  return getPerplexityEmbeddingEnvFrom(process.env);
}

export function getPerplexityEmbeddingEnvFrom(
  source: Record<string, string | undefined>,
) {
  const env = perplexityEmbeddingEnvSchema.parse(source);

  return {
    apiKey: env.PERPLEXITY_API_KEY,
    standardEmbeddingModel: env.PERPLEXITY_EMBEDDING_MODEL,
    contextualEmbeddingModel: env.PERPLEXITY_CONTEXT_EMBEDDING_MODEL,
  };
}

export function getRagRuntimeEnv() {
  return getRagRuntimeEnvFrom(process.env);
}

export function getRagRuntimeEnvFrom(
  source: Record<string, string | undefined>,
) {
  const env = ragRuntimeEnvSchema.parse(source);

  return {
    retrievalBackend: env.RAG_RETRIEVAL_BACKEND,
  };
}

export function getOpenRouterEnv() {
  return getOpenRouterEnvFrom(process.env);
}

export function getOpenRouterEnvFrom(
  source: Record<string, string | undefined>,
) {
  const env = openRouterEnvSchema.parse(source);

  return {
    apiKey: env.OPENROUTER_API_KEY,
    baseUrl: env.OPENROUTER_BASE_URL,
    model: env.OPENROUTER_CHAT_MODEL,
    httpReferer: env.OPENROUTER_HTTP_REFERER,
    appTitle: env.OPENROUTER_APP_TITLE,
    temperature: env.OPENROUTER_TEMPERATURE,
    maxCompletionTokens: env.OPENROUTER_MAX_COMPLETION_TOKENS,
    reasoningEffort: env.OPENROUTER_REASONING_EFFORT,
    reasoningExclude: env.OPENROUTER_REASONING_EXCLUDE,
  };
}

export function shouldUseOpenRouter(
  source: Record<string, string | undefined> = process.env,
) {
  return source.CHAT_PROVIDER === "openrouter" && Boolean(source.OPENROUTER_API_KEY);
}
