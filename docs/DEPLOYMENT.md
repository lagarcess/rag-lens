# Deployment

## Local

```bash
bun install
cp .env.example .env
bun run dev
```

## Supabase

The local Supabase project has been initialized in `supabase/`.

Hosted project:

- Name: `rag-lens`
- Project ref: `yyqmlfisijerlcrbcuvy`
- Region: `us-east-2`
- API URL: `https://yyqmlfisijerlcrbcuvy.supabase.co`
- Org: `RAG Lens`

The earlier provisional project in `ARGUS QUANTITATIVE` was deleted. Add the
publishable key and service role key from the `RAG Lens` project dashboard to
local `.env` and Render environment variables.

Apply migrations after a hosted project exists:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Use the Supabase dashboard for API keys:

- Project settings -> API -> Project URL
- Project settings -> API -> Project API keys

## Render

`render.yaml` defines:

- `rag-lens`: Next.js web service.
- `rag-lens-session-cleanup`: cron job every 30 minutes.

Provisional hosted web service:

- Name: `rag-lens`
- Service ID: `srv-d8vmhc3tqb8s73evn9f0`
- URL: `https://rag-lens.onrender.com`
- Plan: `free`
- Region: `ohio`

These resources were created during setup in existing provider workspaces. The
target production posture is a dedicated Supabase organization/project and a
dedicated Render workspace for `rag-lens`; do not treat the provisional
resources as the long-term home for the project.

Do not use the Render URL as the public share link for the project. Render is
the app/backend origin for the sandbox and warmup path. The recruiter-facing
entry point should eventually be a static GitHub Pages landing page.

Render services require a pushed Git remote for the normal Blueprint flow. After GitHub exists:

```bash
render blueprint launch
```

or create from the Render dashboard using the checked-in `render.yaml`.

Note: the cleanup cron is intentionally not created yet. Render rejected `free`
for cron services in CLI validation, so the Blueprint uses `starter`. Create it
after `SUPABASE_SERVICE_ROLE_KEY` and `PERPLEXITY_API_KEY` are available.

## Deferred GitHub Pages Landing

Future public topology:

- GitHub Pages hosts the shareable landing page for the repo.
- The landing page triggers a low-cost warmup request to the Render app/backend
  origin after first paint, with a short browser-side cooldown.
- The primary CTA stays on GitHub Pages. If Render is already warm, it opens the
  sandbox immediately.
- If Render is still waking up, GitHub Pages shows a theme-aware RAG Lens logo
  loading state and polls a health endpoint before redirecting to `/workbench`.
- The Render origin stays unlisted and is treated as infrastructure, not the URL
  to share publicly.

Operational notes:

- Add CORS for the GitHub Pages origin on the health/warmup endpoint only.
- Keep warmup idempotent and cheap. It should not create sessions, upload data,
  or call model providers.
- Use a small `localStorage` cooldown so every page view does not ping Render.
- Include a timeout state that lets users retry or continue opening the sandbox
  if startup takes longer than expected.
- If the Render origin must be truly private later, add an authenticated proxy or
  a different hosting topology; a browser-opened sandbox origin is still
  reachable by design.

## Model Providers

Perplexity is used for embeddings. OpenRouter is the preferred V1 provider for
final answer generation, which keeps `sonar-pro` costs out of normal chat
responses while still allowing Perplexity embeddings.

Recommended V1 chat defaults:

- `CHAT_PROVIDER=openrouter`
- `OPENROUTER_CHAT_MODEL=deepseek/deepseek-v4-flash`
- `OPENROUTER_TEMPERATURE=0.2`
- `OPENROUTER_MAX_COMPLETION_TOKENS=900`
- `OPENROUTER_REASONING_EFFORT=none`
- `OPENROUTER_REASONING_EXCLUDE=true`

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
