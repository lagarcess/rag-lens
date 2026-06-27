import { z } from "zod";

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

export function getServerEnv() {
  return serverEnvSchema.parse(process.env);
}
