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
- `PERPLEXITY_CHAT_MODEL`
- `CLEANUP_BATCH_SIZE`

## Defaults

V1 defaults:

- Standard query embedding: `pplx-embed-v1-0.6b`
- Contextual document embedding: `pplx-embed-context-v1-0.6b`
- Chat model: `sonar-pro`
- Upload bucket: `rag-uploads`
