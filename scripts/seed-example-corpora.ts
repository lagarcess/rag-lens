import { getPerplexityEmbeddingEnv } from "../src/lib/env";
import { seedExampleCorpora } from "../src/lib/rag/example-seed";
import { createSupabaseAdminClient } from "../src/lib/supabase-admin";

async function main() {
  const perplexity = getPerplexityEmbeddingEnv();
  const supabase = createSupabaseAdminClient();
  const results = await seedExampleCorpora({
    supabase,
    perplexity,
  });

  console.log(JSON.stringify({ ok: true, corpora: results }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
