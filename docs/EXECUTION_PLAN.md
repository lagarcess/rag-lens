# RAG Lens End-to-End Execution Plan

Status: locked for V1 execution on 2026-06-27.

The GitHub Pages landing and Render warmup topology has been reopened as
Slice 11. Render remains the app/backend origin for the sandbox; the public
share URL belongs to GitHub Pages.

## V1 Definition Of Done

A deployed visitor can:

1. Open RAG Lens.
2. Choose curated example documents or upload small temporary documents.
3. Ask a question.
4. Receive an answer with citations.
5. Inspect a trace showing extraction, chunking, embeddings, retrieval scores,
   selected context, prompt assembly, model response, timings, and provider
   metadata.
6. Change basic retrieval settings and compare trace outcomes.
7. Delete their anonymous session immediately.
8. Trust that anonymous uploads expire quickly, can be deleted immediately, and
   are physically purged by monthly Supabase cleanup.

## Required Source Documents

Before changing product behavior, read:

- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/API_CONTRACT.md`
- `docs/SECURITY_PRIVACY.md`
- `docs/ROADMAP.md`
- `DESIGN.md`

Before changing framework, provider, database, or deployment behavior, consult
the current primary docs for that surface:

- Next.js local docs in `node_modules/next/dist/docs/`
- Supabase docs for migrations, Storage, RLS, RPCs, and `pgvector`
- Perplexity docs for embeddings and embedding response format
- OpenRouter docs for chat completions, model parameters, reasoning controls,
  rate limits, and error shape
- Render docs for web services, cron jobs, env vars, health checks, and logs

Codex subagent execution was reviewed against the current OpenAI Codex docs:

- https://developers.openai.com/codex/subagents
- https://developers.openai.com/codex/concepts/subagents
- https://developers.openai.com/codex/learn/best-practices

The operational takeaway is: use subagents for bounded parallel exploration,
tests, review, and disjoint implementation; avoid broad parallel write-heavy
work; close completed agent threads.

## Planning Review Notes

This plan was reviewed with three non-overlapping read-only subagents:

- Backend RAG/API review.
- Frontend workbench/UI review.
- Supabase, retention, deployment, and privacy review.

Findings incorporated into the execution rules:

- The backend RAG slice owns the canonical `RagTrace` type. Frontend slices must
  consume that type and must not define a competing trace shape.
- The first runnable RAG loop should use curated local examples and deterministic
  retrieval before Supabase writes are introduced.
- Local deterministic retrieval must be labeled honestly in the trace and should
  not pretend to be vector similarity.
- The trace inspector should remain a dark precision panel even when the
  surrounding app shell is light.
- OpenRouter env validation belongs in the model-backed answer slice; Supabase
  and Perplexity env parsing should not block local example tests.
- Supabase hardening must include explicit Data API grants for `service_role`
  and avoid broad `anon` or `authenticated` grants in V1.
- Retention semantics must be clear before uploads ship: `expires_at` governs
  active demo expiry, and `hard_expires_at` marks abandoned-upload purge
  eligibility.
- Scheduled cleanup belongs in Supabase Cron, not Render.
- Bundled examples should stay first-party unless a future slice explicitly
  records third-party dataset license review.

## Active Goal And Current Gap

Active goal: finish RAG Lens V1 as a polished standard RAG debugger with a
clear public portfolio entry point. The core RAG system is implemented and
deployed, and the beginner trace clarity slice is complete; the remaining V1
work is public polish and final launch verification.

Current non-deferred V1 focus:

1. Public landing and repo polish: GitHub Pages entry point, Render warmup,
   README screenshots/GIFs, repository metadata, privacy/rate-limit messaging,
   and portfolio narrative.
2. Final launch QA: full local, hosted Supabase, Render, browser, docs, cleanup,
   and secret-boundary verification.

Work these as two normal short-lived branch PRs, not one giant PR:

1. `codex/public-landing-polish`
2. `codex/final-launch-qa`

Do not create worktrees by default. Use a worktree only when it materially
reduces risk or isolates a parallel investigation.

This scope intentionally stays with standard RAG. Re-indexed embedding profiles,
dynamic upload re-chunking, contextualized embedding comparisons, GraphRAG,
agentic RAG, multimodal RAG, account systems, long-term knowledge bases,
advanced eval suites, and distributed production rate limiting are deferred
until after V1.

## Execution Discipline

- Use one cohesive commit per slice.
- Keep each commit independently buildable.
- Do not push or deploy unless the user asks for it.
- Prefer TypeScript/Bun for V1 app logic.
- Do not add Python unless Node extraction or processing becomes a proven
  blocker. If Python is introduced, use Poetry and pytest.
- For TypeScript tests, prefer focused `bun test` coverage before adding heavier
  test infrastructure.
- Use browser QA for visible UI changes.
- Keep `.env` ignored and never stage secrets.
- Run a secret-oriented scan before commits that touch provider or env code.
- Keep Render described as the backend/sandbox origin in docs and UI. Public
  README, portfolio, repo homepage, and social links should point to the
  GitHub Pages public entry.

## Subagent Discipline

The main agent owns integration, final decisions, verification, and commits.

Use subagents only when the task can be split cleanly:

- Read-only scouts may run in parallel for backend, frontend, Supabase/security,
  docs, or test-risk analysis.
- Implementation workers must receive disjoint write scopes.
- No two workers may edit the same file family in parallel.
- Workers must not revert unknown changes.
- Workers must report changed paths, verification commands, and unresolved
  risks.
- The main agent reviews subagent output before integrating it.
- Completed subagent threads must be closed after their results are captured.
- If a subagent is stale, duplicated, or no longer needed, close it before
  spawning replacement work.
- Do not keep exploratory worktrees or generated artifacts around after their
  findings have been integrated.

## Embedding Profile Rule

Similarity search must compare vectors from the same embedding space. The V1
seeded Supabase example path uses standard Perplexity embeddings for both
document chunks and query vectors:

- Document chunks: `PERPLEXITY_EMBEDDING_MODEL`
- Query vectors: `PERPLEXITY_EMBEDDING_MODEL`
- Seeded profile: default chunk size, default overlap, `embeddingMode=standard`

Contextualized embeddings remain part of the roadmap, but they require a
separate seeded or freshly ingested vector profile before the UI can compare
them honestly.

## Worktree And Cleanup Discipline

Default to the current checkout unless isolation is needed.

If a temporary worktree is needed:

- Prefer Codex-managed worktrees when available.
- If using manual `git worktree`, create it under an ignored `.worktrees/`
  directory only after verifying it is ignored.
- Do not install duplicate dependency caches unless required.
- Do not commit worktree folders, build outputs, `.next`, `node_modules`, or
  temporary screenshots.
- After integrating useful work, remove the temporary worktree and run
  `git worktree prune`.
- Confirm no bloat files remain with `git status --short` and targeted `du` or
  `find` checks when large generated artifacts were involved.

## Verification Gate

Before each commit, run the relevant subset:

- `bun run lint`
- `bun run build`
- targeted `bun test` once tests exist
- `git diff --check`
- `curl -fsS http://localhost:3000/api/health` when the dev server is running
- browser screenshot/interaction checks for UI slices
- secret scan for env/provider/database slices
- `bun run smoke:supabase -- --json` before Render deployment work once hosted
  Supabase env vars are configured
- `bun run smoke:supabase:integration -- --json` before first Render deployment
  and after hosted Supabase migration or Storage policy changes
- `bun run preflight:render` before any Render resource creation, update, or
  dashboard launch workflow

The final slice before deployment must also verify:

- Supabase migrations apply cleanly.
- Example data seeds cleanly.
- Upload expiry and cleanup delete Storage objects and database rows.
- Render build and health check pass.
- Browser bundle does not contain service-role or provider keys.

## Cohesive Implementation Slices

### Slice 1 - Roadmap Lock

Goal: Freeze the execution plan and subagent rules before implementation starts.

Deliverables:

- This execution plan.
- `docs/ROADMAP.md` updated to point here as the controlling V1 plan.

Verification:

- `bun run lint`
- `bun run build`
- `git diff --check`

Commit:

```bash
git commit -m "docs: lock RAG Lens execution plan"
```

### Slice 2 - Trace Contract And Example Data

Goal: Define the canonical RAG trace shape and add curated local example
documents so RAG Lens works without uploads first.

Deliverables:

- Shared `RagTrace` TypeScript types.
- Curated markdown corpora checked into the repo.
- Deterministic chunking and lexical retrieval for examples.
- API route returning a full trace without provider calls.
- Focused tests for chunking, scoring, and trace shape.
- Trace metadata that clearly labels local example retrieval as deterministic
  lexical retrieval, not vector search.
- Server env parsing split so local example tests do not require Supabase,
  Perplexity, or OpenRouter secrets.

Verification:

- `bun test` for RAG library tests.
- `bun run lint`
- `bun run build`

Commit:

```bash
git commit -m "feat(rag): add example corpus trace runner"
```

### Slice 3 - Model-Backed Answers

Goal: Use OpenRouter server-side to turn retrieved context into an answer with
citations.

Deliverables:

- Server-only OpenRouter client.
- OpenRouter env validation aligned with `.env.example` and deployment docs.
- Prompt assembly service.
- Answer generation route path in the trace runner.
- Provider timing and model metadata in `RagTrace`.
- Weak-retrieval response behavior.

Verification:

- Unit tests for prompt assembly and citation mapping.
- One local API call using `.env` credentials.
- Secret scan.
- `bun run lint`
- `bun run build`

Commit:

```bash
git commit -m "feat(rag): add model-backed trace answers"
```

### Slice 4 - Workbench Data Integration

Goal: Replace mock workbench content with live trace data from the API.

Deliverables:

- Workbench client state for corpus, question, settings, loading, errors, and
  trace result.
- Trace inspector rendering from the backend-owned `RagTrace` type.
- Answer card with citations.
- Empty, loading, error, and weak-context states.
- Responsive and theme-aware QA.
- Dark trace inspector tokens preserved in light and dark app themes.

Verification:

- Browser QA on landing and workbench.
- `bun run lint`
- `bun run build`

Commit:

```bash
git commit -m "feat(workbench): connect UI to trace runner"
```

### Slice 5 - Supabase Session And Schema Hardening

Goal: Make anonymous sessions and persistence rules real before uploads.

Deliverables:

- Reviewed Supabase migration for sessions, corpora, documents, chunks, queries,
  retrievals, indexes, RLS, and cleanup RPC.
- Explicit Data API grants for `service_role` on V1 tables and functions.
- No broad `anon` or `authenticated` table/function grants for V1 app data.
- Retention constraints that require uploads and derived rows to carry
  `session_id`, `expires_at`, and `hard_expires_at` where applicable.
- Server-only Supabase admin client usage.
- Session create, heartbeat, delete routes.
- Session expiry UI.

Verification:

- Migration applies to the RAG Lens Supabase project.
- Routes create and delete session rows with expiry fields.
- Grants and RLS are verified locally before hosted changes are pushed.
- `bun run lint`
- `bun run build`

Commit:

```bash
git commit -m "feat(session): add Supabase session lifecycle"
```

### Slice 6 - Perplexity Embeddings And Vector Retrieval

Goal: Store normalized embeddings and retrieve ranked chunks with Supabase
`pgvector`.

Deliverables:

- Perplexity embedding client.
- Base64 int8 decode and L2 normalization.
- Chunk embedding pipeline.
- Query embedding pipeline.
- `match_rag_chunks` RPC integration.
- Similarity score display in the trace.

Verification:

- Unit tests for embedding decode/normalization with fixtures.
- Local retrieval against seeded examples.
- Confirm cosine distance ranking.
- Secret scan.
- `bun run lint`
- `bun run build`

Commit:

```bash
git commit -m "feat(rag): add Supabase vector retrieval"
```

Status: complete for seeded example vectors and default-profile query
retrieval.

### Slice 6.1 - First-Party Example Coverage

Goal: Replace disabled benchmark-branded example placeholders with active,
license-clean first-party corpora.

Deliverables:

- Shared example corpus manifest.
- Claim Check Clinic corpus for claim/evidence retrieval.
- Two-Hop Systems Brief corpus for multi-hop retrieval.
- Workbench source cards ready for all bundled examples.
- Seed script covers every active bundled corpus.
- Supabase corpus metadata migration for the new first-party slugs.

Verification:

- Focused tests for manifest, corpus loading, query traces, workbench source
  state, and seedable slugs.
- Supabase migration applies to the linked RAG Lens project.
- Hosted example seeding runs for all bundled corpora.
- Browser QA confirms the workbench source list shows three ready corpora.

Status: implemented and applied to the linked RAG Lens Supabase project. Hosted
verification shows the three first-party corpora seeded with 1 document each and
2/3/3 vector chunks.

### Slice 7 - Upload And Extraction

Goal: Let anonymous users upload small temporary PDF, text, and markdown files.

Deliverables:

- Upload route with file type, count, and size validation.
- Supabase Storage write under a session-scoped path.
- Text extraction for supported files.
- Ingestion status states.
- User-facing privacy warning and delete-now action.

Verification:

- Reject unsupported file types.
- Reject files over configured limits.
- Uploaded rows and derived rows carry `session_id` and expiry fields.
- Browser QA for upload states.
- `bun run lint`
- `bun run build`

Commit:

```bash
git commit -m "feat(upload): add session-scoped document ingestion"
```

Status: complete for synchronous upload, extraction, default-profile chunking,
embedding, session-scoped vector insertion, upload-source selection, and
session vector querying.

### Slice 8 - Trace Persistence And History

Goal: Save useful traces while the anonymous session is alive.

Deliverables:

- Persist query, answer, prompt, retrieval rows, and trace JSON.
- Recent traces list scoped to the current session.
- Trace reload path.
- Expired trace access blocked by session expiry.

Verification:

- Saved traces reload during an active session.
- Expired/deleted session traces are unavailable.
- `bun run lint`
- `bun run build`

Status: implemented for uploaded-session traces. Example traces remain
ephemeral because local example chunk IDs are not database chunk foreign keys.

Commit:

```bash
git commit -m "feat(trace): persist session trace history"
```

### Slice 9 - Cleanup And Retention

Goal: Enforce anonymous upload retention end to end.

Deliverables:

- Cleanup script that removes expired Storage objects before database rows.
- Supabase cleanup Edge Function and monthly Cron schedule finalized.
- Local dry-run and real-run modes.
- Cleanup logs counts only, never file contents.
- Cleanup preserves example corpora and non-expired sessions.
- Cron credentials stored in Supabase Vault.

Verification:

- `bun run cleanup:sessions:dry-run`
- Expired fixture data is removed.
- Non-expired session data remains.
- Example corpora remain untouched.
- `bun run cleanup:sessions`
- `bun run lint`
- `bun run build`

Commit:

```bash
git commit -m "feat(retention): add expired session cleanup"
```

Status: implemented locally. Cleanup deletes Storage objects before database
rows, scopes row deletion to processed Storage paths, and has a local dry-run
mode for count-only verification. Hosted scheduled cleanup is owned by
Supabase Cron and the cleanup Edge Function.

### Slice 9.1 - Immediate Session Deletion

Goal: Make the delete-now action physically purge uploaded data immediately
instead of relying only on scheduled cleanup.

Deliverables:

- A focused server-side cleanup service for a specific anonymous session.
- `DELETE /api/sessions/:sessionId` marks the session deleted, removes its
  Storage objects, and deletes session-scoped rows in Storage-first order.
- If immediate physical cleanup fails after the session is marked deleted, the
  route reports the cleanup failure and leaves the scheduled cleanup job able
  to retry safely.
- The cleanup path logs counts and identifiers only, never uploaded content.
- The API contract and privacy docs distinguish immediate deletion from the
  24-hour abandoned-session backstop.

Verification:

- Focused tests prove Storage deletion happens before database row deletion.
- Focused tests prove delete-now does not target unrelated sessions or curated
  example corpora.
- `bun test`
- `bun run lint`
- `bun run build`
- `git diff --check`
- Secret scan for provider and service-role env names.

Commit:

```bash
git commit -m "feat(retention): purge deleted sessions immediately"
```

Status: implemented locally. Delete-now now marks only active anonymous sessions
deleted, removes that session's known Storage objects, deletes the deleted
session row so cascades clear derived rows, and returns retry-pending metadata
when cleanup cannot be confirmed after the delete marker is set.

### Slice 10 - Experiment Mode

Goal: Teach RAG tradeoffs through controlled reruns.

Deliverables:

- Controls for chunk size, overlap, top-k, and embedding mode.
- Rerun creates a separate trace.
- Side-by-side comparison for two traces.
- Compact failure-mode notes for low similarity, missing context, and oversized
  chunks.

Verification:

- Changing settings changes the trace parameters.
- Comparison shows retrieval and prompt differences.
- Browser QA for desktop and mobile.
- `bun run lint`
- `bun run build`

Commit:

```bash
git commit -m "feat(experiment): compare RAG trace settings"
```

Status: implemented locally for example and upload workbench traces. Example
corpora can compare top-k, chunk size, overlap, and embedding mode at query
time. Uploaded-session documents can compare top-k immediately; changing chunk
size, overlap, or embedding profile for uploads requires a future re-indexing
profile slice so the UI labels those controls as locked for uploads.

### Completed Deployment Slice - Render Backend Deployment

Goal: Deploy the backend/app origin correctly without treating it as the public
share URL.

Deliverables:

- `bun run preflight:render` blocks package, Blueprint, Render cron, secret
  placeholder, and wrong-workspace deployment drift before service creation.
- Render env vars configured.
- `render.yaml` verified.
- Health check verified.
- Supabase cleanup function and monthly Cron verified or explicitly deferred
  with reason.
- README deploy instructions updated from actual deployment evidence.

Verification:

- Render preflight passes in the dedicated `rag-lens` workspace.
- Render build succeeds.
- Render health endpoint returns OK.
- Example corpus trace works on Render.
- Upload cleanup works or is explicitly blocked on plan limits.
- No secrets in logs, browser bundle, or repository.

Commit:

```bash
git commit -m "chore(deploy): finalize Render backend deployment"
```

Status: implemented for the current backend/app deployment. The dedicated RAG
Lens Supabase project has all checked-in migrations applied, Supabase advisors
return no warning-level issues, cleanup dry-run succeeds, and
`bun run preflight:render` validates local package/Blueprint invariants before
Render cloud resource creation. The deployment commits were pushed to GitHub
after explicit approval so Render could build the current `main` branch. The
Blueprint is configured for hosted V1 with `RAG_RETRIEVAL_BACKEND=supabase`;
local lexical retrieval remains a development fallback. The active Render CLI
workspace is `rag-lens` (`tea-d8vvqob7uimc738uflsg`). The dedicated workspace
contains only the web service `rag-lens` (`srv-d900drho3t8c73bpvr80`) at
`https://rag-lens-mx20.onrender.com`. Scheduled abandoned-upload cleanup is
owned by Supabase Cron plus the `cleanup-expired-sessions` Edge Function, and
live smoke checks passed for health, source catalog, cleanup dry-run, and one
Supabase pgvector plus OpenRouter query.

### Completed Portfolio Slice - Portfolio Polish

Goal: Make the project understandable and credible for recruiters and GitHub
visitors.

Deliverables:

- README with architecture diagram, local setup, env guide, demo flow, and
  text-first portfolio copy. Screenshots stay deferred until the workbench UI
  stabilizes.
- Docs aligned with shipped behavior.
- Final UI copy pass.
- Final accessibility and responsive pass.
- Known limitations section.

Verification:

- Fresh clone setup path documented.
- Browser QA on landing and workbench.
- `bun run lint`
- `bun run build`

Commit:

```bash
git commit -m "docs: polish RAG Lens portfolio materials"
```

Status: implemented for the current portfolio package. README now includes
architecture, setup, environment notes, demo flow, current status, known
limitations, and text-first portfolio positioning without embedded screenshots.
Browser QA captured the landing page and a completed workbench trace on June
27, 2026 as QA artifacts. Render app/backend deployment is live in the
dedicated `rag-lens` workspace at `https://rag-lens-mx20.onrender.com`.

### Slice 11 - Public Landing And Repo Polish

Goal: Make the recruiter-facing URL instant and credible while keeping Render
as the sandbox/app origin rather than the public URL to share.

Deliverables:

- GitHub Pages landing page for `https://lagarcess.github.io/rag-lens/`.
- Theme-aware RAG Lens loading interstitial.
- Render health/warmup endpoint with narrow CORS for the GitHub Pages origin.
- CTA flow that warms Render, waits when needed, then redirects to
  `/workbench`.
- Browser-side warmup cooldown to avoid pinging Render on every visit.
- README and portfolio links that point to GitHub Pages, not Render.
- README hero with tagline, screenshots or GIFs, quickstart, "what you will
  learn," architecture highlights, live demo link, and portfolio narrative.
- Repository description, topics, and social-preview guidance aligned to the
  standard RAG debugger positioning.
- Clear privacy and rate-limit messaging for temporary anonymous uploads.

Verification:

- Cold Render service is warmed by landing-page visit.
- Warm Render service opens the sandbox quickly.
- Loading interstitial appears only while the sandbox is not ready.
- Warmup endpoint does not create sessions or call model providers.
- README links, screenshots, and setup steps are current.
- Browser QA covers the landing page, warmup/loading path, desktop workbench,
  mobile workbench, example query, upload rejection states, and delete-now flow.
- `bun test`
- `bun run lint`
- `bun run build`
- `bun run preflight:render`
- `git diff --check`

Commit:

```bash
git commit -m "docs: polish public RAG Lens entry"
```

Status: implemented on `codex/public-landing-polish`, pending PR review, merge,
and GitHub Pages enablement from `/docs` on `main`. The branch adds the static
Pages entry, Next landing polish, provider-free `/api/warmup`, narrow CORS for
the Pages origin, browser-side cooldown, repository presentation guidance,
privacy/rate-limit messaging, and browser QA evidence for desktop/mobile
landing and workbench surfaces.

### Slice 12 - Final Launch QA

Goal: Confirm RAG Lens V1 is portfolio-ready end to end and stop adding V1
scope.

Deliverables:

- Full verification pass for local repo, hosted Supabase, Render, docs, cleanup,
  and browser flows.
- Manual smoke tests for example corpora, text/markdown upload success, PDF
  upload success, oversized upload rejection, wrong MIME rejection, session
  expiry messaging, and delete-now cleanup.
- Hosted Supabase smoke and integration smoke remain count-only and leave no
  fixture data behind.
- Final docs alignment across README, product, architecture, API contract,
  security, deployment, testing, roadmap, and project lock.
- Known limitations stay explicit and do not read like accidental omissions.

Verification:

- `bun test`
- `bun run lint`
- `bun run build`
- `bun run preflight:render`
- `bun run smoke:supabase -- --json`
- `bun run smoke:supabase:integration -- --json`
- `git diff --check`
- Browser QA evidence for landing, workbench, completed trace, comparison, and
  upload/delete flow.

Status: next after Slice 11 is merged and the live public entry is enabled.

## Review Checklist

- The plan implements the V1 product promise without cloning RAG Play.
- Every slice has one clear user-facing or infrastructure outcome.
- Supabase writes are deferred until the local trace loop is useful.
- Upload retention is not optional once uploads exist.
- Provider keys remain server-only.
- Render remains backend/app infrastructure, not the public share URL.
- Tests are relevant to risky logic rather than broad framework coverage.
- Worktree and subagent cleanup are explicit.
