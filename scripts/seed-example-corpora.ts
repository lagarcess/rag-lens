import { getPerplexityEmbeddingEnv } from "../src/lib/env";
import { seedExampleCorpus } from "../src/lib/rag/example-seed";
import { createSupabaseAdminClient } from "../src/lib/supabase-admin";

async function main() {
  const perplexity = getPerplexityEmbeddingEnv();
  const supabase = createSupabaseAdminClient();
  const result = await seedExampleCorpus({
    corpusSlug: "rag-concepts-primer",
    supabase,
    perplexity,
  });

  console.log(JSON.stringify({ ok: true, ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
