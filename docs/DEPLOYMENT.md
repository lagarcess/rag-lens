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

Status on June 27, 2026: the local CLI is linked to the dedicated `RAG Lens`
project ref `yyqmlfisijerlcrbcuvy`, all checked-in migrations are applied on
the remote project, security and performance advisors return no warning-level
issues, and `bun run cleanup:sessions:dry-run` succeeds with count-only output.

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

The web service Blueprint sets `RAG_RETRIEVAL_BACKEND=supabase`. This is the
intended hosted V1 behavior because the dedicated Supabase project has seeded
example vectors and uploaded documents are indexed into Supabase. Keep
`RAG_RETRIEVAL_BACKEND=local` only for zero-dependency local example traces.

Current blocker on June 27, 2026: do not deploy from the currently selected
Render workspace. The Render CLI account only exposes these workspaces:

- `argus-prod`
- `payment-ledger`

Neither is the dedicated `RAG Lens` workspace required for this project. Create
or grant access to a dedicated Render workspace named `RAG Lens`, then run:

```bash
render workspaces
render workspace set <rag-lens-workspace-id>
render workspace current -o json
```

Only after `render workspace current` shows the dedicated RAG Lens workspace
should the web service or cleanup cron be created.

Before using the Render dashboard, Blueprint flow, or any CLI creation command,
run the local preflight:

```bash
bun run preflight:render
```

The preflight checks the active Render workspace before validating
`render.yaml`. It intentionally fails while the CLI is pointed at `argus-prod`
or any workspace other than `RAG Lens`. After the dedicated workspace exists,
set `RENDER_EXPECTED_WORKSPACE_ID` in local `.env` so the guard checks the
pinned workspace ID instead of relying on the display name alone.

Provisional hosted web service in the wrong workspace:

- Name: `rag-lens`
- Service ID: `srv-d8vmhc3tqb8s73evn9f0`
- URL: `https://rag-lens.onrender.com`
- Plan: `free`
- Region: `ohio`

These resources were created during setup in `argus-prod`. Do not treat them as
the long-term home for the project, and do not use them for recruiter-facing
deployment evidence. Remove or ignore them after the dedicated Render workspace
is available.

Do not use the Render URL as the public share link for the project. Render is
the app/backend origin for the sandbox and warmup path. The recruiter-facing
entry point should eventually be a static GitHub Pages landing page.

Render services require a pushed Git remote for the normal Blueprint flow. After GitHub exists:

```bash
bun run preflight:render
render blueprints validate ./render.yaml
```

The CLI available in this workspace can validate Blueprints but does not expose
a Blueprint launch command. Create the services from the Render dashboard using
the checked-in `render.yaml`, or use `render services create` only after the
dedicated workspace is selected.

Do not add `SUPABASE_PROJECT_REF` to Render runtime env vars. It is local
CLI/operations metadata for `supabase link`, not a value consumed by the
Next.js service or cleanup cron.

Note: the cleanup cron is intentionally safe to defer. Render rejected `free`
for cron services in CLI validation, so the Blueprint uses `starter`. Create it
after the cleanup Supabase env vars are available; the cron does not need
Perplexity or OpenRouter credentials.

Before enabling the cron against hosted data, run:

```bash
bun run cleanup:sessions:dry-run
```

The dry-run lists only counts. It does not remove Storage objects or database
rows. The real cron command is:

```bash
bun run cleanup:sessions
```

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

### Web service

Set these on the `rag-lens` web service:

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
- `RAG_RETRIEVAL_BACKEND=supabase`
- `RAG_SESSION_SOFT_TTL_HOURS`
- `RAG_SESSION_HARD_TTL_HOURS`
- `RAG_RATE_LIMIT_WINDOW_MS`
- `RAG_RATE_LIMIT_QUERY_MAX`
- `RAG_RATE_LIMIT_UPLOAD_MAX`
- `RAG_RATE_LIMIT_SESSION_MAX`

### Cleanup cron

Set only these on `rag-lens-session-cleanup`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `CLEANUP_BATCH_SIZE`
