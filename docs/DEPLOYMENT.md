# Deployment

## Local

```bash
bun install
cp .env.example .env
bun run dev
```

## Supabase

The local Supabase project has been initialized in `supabase/`.

Provisioned hosted project:

- Name: `rag-lens`
- Project ref: `ycdvnvsosghbcgreosry`
- Region: `us-east-2`
- API URL: `https://ycdvnvsosghbcgreosry.supabase.co`

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

- `rag-lens`: Next.js web service.
- `rag-lens-session-cleanup`: cron job every 30 minutes.

Provisioned hosted web service:

- Name: `rag-lens`
- Service ID: `srv-d8vmhc3tqb8s73evn9f0`
- URL: `https://rag-lens.onrender.com`
- Plan: `free`
- Region: `ohio`

Render services require a pushed Git remote for the normal Blueprint flow. After GitHub exists:

```bash
render blueprint launch
```

or create from the Render dashboard using the checked-in `render.yaml`.

Note: the cleanup cron is intentionally not created yet. Render rejected `free`
for cron services in CLI validation, so the Blueprint uses `starter`. Create it
after `SUPABASE_SERVICE_ROLE_KEY` and `PERPLEXITY_API_KEY` are available.

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
