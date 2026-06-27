# Environment Variables

## Browser-Safe

These may use `NEXT_PUBLIC_`:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Server-Only

These must never use `NEXT_PUBLIC_`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `PERPLEXITY_API_KEY`
- `PERPLEXITY_EMBEDDING_MODEL`
- `PERPLEXITY_CONTEXT_EMBEDDING_MODEL`
- `CHAT_PROVIDER`
- `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL`
- `OPENROUTER_CHAT_MODEL`
- `OPENROUTER_HTTP_REFERER`
- `OPENROUTER_APP_TITLE`
- `OPENROUTER_TEMPERATURE`
- `OPENROUTER_MAX_COMPLETION_TOKENS`
- `OPENROUTER_REASONING_EFFORT`
- `OPENROUTER_REASONING_EXCLUDE`
- `RAG_RETRIEVAL_BACKEND`
- `RAG_SESSION_SOFT_TTL_HOURS`
- `RAG_SESSION_HARD_TTL_HOURS`
- `RAG_RATE_LIMIT_WINDOW_MS`
- `RAG_RATE_LIMIT_QUERY_MAX`
- `RAG_RATE_LIMIT_UPLOAD_MAX`
- `RAG_RATE_LIMIT_SESSION_MAX`
- `CLEANUP_BATCH_SIZE`

## Local CLI / Operations Only

These are useful for local Supabase CLI workflows but are not required by the
Next.js runtime or Render services:

- `SUPABASE_PROJECT_REF`
- `RENDER_EXPECTED_WORKSPACE_NAME`
- `RENDER_EXPECTED_WORKSPACE_ID`

`RENDER_EXPECTED_WORKSPACE_NAME` defaults to `rag-lens` for
`bun run preflight:render`. Set `RENDER_EXPECTED_WORKSPACE_ID` after the
dedicated Render workspace exists so deployment checks use the pinned workspace
ID. These values are local operations guards and should not be added to Render
runtime service env vars.

## Defaults

V1 defaults:

- Standard query embedding: `pplx-embed-v1-0.6b`
- Contextual document embedding: `pplx-embed-context-v1-0.6b`
- Answer provider: OpenRouter is enabled when `CHAT_PROVIDER=openrouter` and
  `OPENROUTER_API_KEY` are configured.
- Chat model: `deepseek/deepseek-v4-flash`
- Local retrieval backend: `local` for zero-dependency example traces.
- Hosted V1 retrieval backend: `supabase` because the dedicated RAG Lens
  Supabase project is seeded with example vectors and upload vectors are always
  stored in Supabase.
- Upload bucket: `rag-uploads`
- Anonymous session soft TTL: `2` hours.
- Anonymous session hard purge target: `23.5` hours.
- Public API throttles: `20` queries, `6` uploads, and `10` session creates per
  minute per client address on the active app instance.
- Render preflight workspace name: `RAG Lens`.
