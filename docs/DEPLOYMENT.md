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
issues, `bun run cleanup:sessions:dry-run` succeeds with count-only output, and
`bun run smoke:supabase -- --json` plus
`bun run smoke:supabase:integration -- --json` pass hosted checks. The
integration smoke leaves zero fixture rows and zero fixture Storage objects.

Apply migrations after a hosted project exists:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

### Scheduled Upload Cleanup

Scheduled abandoned-upload cleanup is owned by Supabase, not Render.

- Supabase Cron job: `rag-lens-monthly-upload-cleanup`.
- Schedule: `0 8 1 * *` (first day of each month at 08:00 UTC).
- Execution target: `cleanup-expired-sessions` Edge Function.
- Credentials: Supabase Vault secrets
  `rag_lens_cleanup_project_url` and
  `rag_lens_cleanup_token`, plus Edge Function secret
  `RAG_LENS_CLEANUP_TOKEN`.

Create or update the Vault secrets before enabling the schedule against hosted
data:

```sql
select vault.create_secret(
  'https://yyqmlfisijerlcrbcuvy.supabase.co',
  'rag_lens_cleanup_project_url',
  'RAG Lens project API URL for monthly upload cleanup'
);

select vault.create_secret(
  '<generated-cleanup-token>',
  'rag_lens_cleanup_token',
  'Dedicated bearer token used only by Supabase Cron to invoke cleanup'
);
```

Deploy the cleanup function after linking the hosted project:

```bash
supabase functions deploy cleanup-expired-sessions
```

The function logs count-only JSON and deletes Storage objects before database
rows. Manual delete-now remains immediate through the Next.js session delete
route.

Use the Supabase dashboard for API keys:

- Project settings -> API -> Project URL
- Project settings -> API -> Project API keys

## Render

`render.yaml` defines:

- `rag-lens`: Next.js web service.

The web service Blueprint sets `RAG_RETRIEVAL_BACKEND=supabase`. This is the
intended hosted V1 behavior because the dedicated Supabase project has seeded
example vectors and uploaded documents are indexed into Supabase. Keep
`RAG_RETRIEVAL_BACKEND=local` only for zero-dependency local example traces.

Current Render workspace status on June 27, 2026:

- Dedicated workspace: `rag-lens` (`tea-d8vvqob7uimc738uflsg`).
- CLI active workspace is `rag-lens`.
- Web service: `rag-lens` (`srv-d900drho3t8c73bpvr80`).
- Web URL: `https://rag-lens-mx20.onrender.com`.
- `bun run preflight:render` passes against the dedicated workspace and
  validates the web-only Blueprint shape.
- The web deploy is live on commit
  `2f88c49effd1d5e3819f9fd3fc886aeec9b7704a`.
- Live smoke checks passed for `/api/health`, `/api/corpora`, and one
  `/api/query` request using Supabase pgvector retrieval plus OpenRouter answer
  generation.

The first web service creation predicted `https://rag-lens.onrender.com`, but
Render assigned `https://rag-lens-mx20.onrender.com`. If future code starts
depending on canonical origin metadata, update the Render web service env vars
`NEXT_PUBLIC_SITE_URL` and `OPENROUTER_HTTP_REFERER` to the assigned URL. Render
CLI v2.20.0 can set env vars during service creation but does not expose an env
var update command; use the Render dashboard or API for that correction.

Before any Render creation or update, verify the dedicated workspace:

```bash
render workspaces
render workspace set tea-d8vvqob7uimc738uflsg
render workspace current -o json
```

Only after `render workspace current` shows the dedicated `rag-lens` workspace
should the web service be created or updated.

Before using the Render dashboard, Blueprint flow, or any CLI creation command,
run the local preflight:

```bash
bun run preflight:render
```

The preflight first validates local deployment files, then checks the active
Render workspace before running Render Blueprint validation. Local checks cover
the package name, required package scripts, web service shape, the web
`free` plan, hosted `RAG_RETRIEVAL_BACKEND=supabase`, secret placeholders,
absence of `SUPABASE_PROJECT_REF`, and absence of Render cron services. It
intentionally fails while the CLI is pointed at `argus-prod` or any workspace
other than `rag-lens`. Set
`RENDER_EXPECTED_WORKSPACE_ID` in local `.env` so the guard checks the pinned
workspace ID instead of relying on the display name alone.

Wrong-workspace Render services removed from `argus-prod` after project-owner
confirmation:

- Name: `rag-lens`
- Service ID: `srv-d8vmhc3tqb8s73evn9f0`
- URL: `https://rag-lens.onrender.com`
- Plan: `free`
- Region: `ohio`
- Name: `rag-lens-web`
- Service ID: `srv-d8vmf88k1i2s73et9odg`
- URL: `https://rag-lens-web.onrender.com`
- Plan: `free`
- Region: `ohio`

These resources were created during setup in `argus-prod` and removed before
the dedicated `rag-lens` workspace deployment. Do not recreate RAG Lens services
in `argus-prod` or any unrelated workspace.

Do not use the Render URL as the public share link for the project. Render is
the app/backend origin for the sandbox and warmup path. The recruiter-facing
entry point should eventually be a static GitHub Pages landing page.

Render services require a pushed Git remote for the normal Blueprint flow.
Before creating or updating Render services, confirm whether local commits are
published:

```bash
git status --short --branch
git log --oneline origin/main..HEAD
```

Render will only build commits that are available on GitHub. Keep the execution
rule intact: do not push unless the user explicitly asks.

After the intended commits are published and the dedicated workspace is
selected:

```bash
bun run preflight:render
render blueprints validate ./render.yaml
```

The CLI available in this workspace can validate Blueprints but does not expose
a Blueprint launch command. The initial Render resources were created with
`render services create` only after the dedicated workspace was selected and
`bun run preflight:render` passed.

Do not add `SUPABASE_PROJECT_REF` to Render runtime env vars. It is local
CLI/operations metadata for `supabase link`, not a value consumed by the
Next.js service.

Before enabling or changing hosted cleanup, run:

```bash
bun run cleanup:sessions:dry-run
```

The dry-run lists only counts. It does not remove Storage objects or database
rows. The local manual destructive cleanup command is:

```bash
bun run cleanup:sessions
```

Before creating Render services, also run the hosted Supabase read-only smoke
gate:

```bash
bun run smoke:supabase -- --json
```

This validates the dedicated Supabase project's seeded example corpora, Storage
bucket reachability, vector retrieval RPC, and cleanup dry-run plumbing without
creating or deleting fixtures.

For the final hosted data-path gate, run the explicit mutating integration
smoke:

```bash
bun run smoke:supabase:integration -- --json
```

This creates one disposable anonymous session, uploads one tiny text fixture,
persists and reloads an uploaded-document trace, purges the session, and verifies
zero remaining fixture rows or Storage objects. Output must remain count-only;
do not paste raw session IDs, Storage paths, prompts, or provider responses into
deployment notes.

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

### Supabase cleanup

Render does not own scheduled cleanup. The monthly cleanup function uses
Supabase-managed secrets plus optional function env:

- `SUPABASE_STORAGE_BUCKET`
- `CLEANUP_BATCH_SIZE`
