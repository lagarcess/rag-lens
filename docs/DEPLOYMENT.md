# Deployment

## Local

```bash
bun install
cp .env.example .env
bun run dev
```

## Supabase

The local Supabase project has been initialized in `supabase/`.

Apply migrations after a hosted project exists:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Hosted project creation through the connector is possible, but Supabase requires:

1. Organization selection.
2. Cost lookup.
3. Explicit cost confirmation.

## Render

`render.yaml` defines:

- `rag-lens-web`: Next.js web service.
- `rag-lens-session-cleanup`: cron job every 30 minutes.

Render services require a pushed Git remote for the normal Blueprint flow. After GitHub exists:

```bash
render blueprint launch
```

or create from the Render dashboard using the checked-in `render.yaml`.

## Required Render Env Vars

Set these in Render:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `PERPLEXITY_API_KEY`
- `PERPLEXITY_EMBEDDING_MODEL`
- `PERPLEXITY_CONTEXT_EMBEDDING_MODEL`
- `PERPLEXITY_CHAT_MODEL`
