# RAG Lens End-to-End Execution Plan

Status: locked for V1 execution on 2026-06-27.

This plan excludes the deferred GitHub Pages landing and warmup topology. Render
is treated as the unlisted app/backend origin for the sandbox until that
deferred slice is explicitly reopened.

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
8. Trust that anonymous uploads and derived data are deleted within 24 hours.

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
  active demo expiry, and `hard_expires_at` is the physical purge deadline.
- Render cron should run with the smallest env surface possible.
- Bundled examples should stay first-party unless a future slice explicitly
  records third-party dataset license review.

## Active Goal And Current Gap

Active goal: drive RAG Lens from this locked roadmap through fully functional
local and deployed V1 slices, using non-overlapping subagents for independent
implementation and review work, and committing each cohesive slice after
verification.

Current non-deferred V1 focus after Slice 9.1:

1. Keep the scheduled cleanup job as a retry/backstop for expired sessions,
   failed immediate purges, and abandoned browser sessions.
2. Keep `render.yaml` and deployment docs aligned with hosted V1 behavior:
   Supabase vector retrieval, OpenRouter chat generation, and minimal cleanup
   cron env.
3. Deploy only after a dedicated RAG Lens Render workspace exists or the user
   explicitly authorizes the target workspace.
4. Run `bun run preflight:render` before any Render dashboard, Blueprint, or CLI
   creation step.

This excludes the deferred GitHub Pages landing and warmup topology.

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
- Keep Render backend-only/unlisted in docs and UI until the deferred public
  entry topology is reopened.

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
- Render cron command finalized.
- Local dry-run and real-run modes.
- Cleanup logs counts only, never file contents.
- Cleanup preserves example corpora and non-expired sessions.
- Cron env surface limited to Supabase cleanup requirements.

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
mode for count-only verification. Hosted cron creation remains part of the
Render deployment slice.

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

### Slice 11 - Render Backend Deployment

Goal: Deploy the backend/app origin correctly without treating it as the public
share URL.

Deliverables:

- `bun run preflight:render` blocks deployment from unrelated Render
  workspaces and validates the Blueprint.
- Render env vars configured.
- `render.yaml` verified.
- Health check verified.
- Cleanup cron verified or explicitly deferred with reason.
- README deploy instructions updated from actual deployment evidence.

Verification:

- Render preflight passes in the dedicated RAG Lens workspace.
- Render build succeeds.
- Render health endpoint returns OK.
- Example corpus trace works on Render.
- Upload cleanup works or is explicitly blocked on plan limits.
- No secrets in logs, browser bundle, or repository.

Commit:

```bash
git commit -m "chore(deploy): finalize Render backend deployment"
```

Status: partially progressed. GitHub `main` is pushed, the dedicated RAG Lens
Supabase project has all checked-in migrations applied, Supabase advisors return
no warning-level issues, cleanup dry-run succeeds, and `render.yaml` validates.
The Blueprint is configured for hosted V1 with
`RAG_RETRIEVAL_BACKEND=supabase`; local lexical retrieval remains a development
fallback. Do not deploy the Render services yet: the active Render account
currently only exposes `argus-prod` and `payment-ledger`, not a dedicated RAG
Lens workspace. Create or grant access to that workspace before creating the
backend web service or cleanup cron.

### Slice 12 - Portfolio Polish

Goal: Make the project understandable and credible for recruiters and GitHub
visitors.

Deliverables:

- README with screenshots, architecture diagram, local setup, env guide, and
  demo flow.
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
screenshots, architecture, setup, environment notes, demo flow, current status,
and known limitations. Browser QA captured the landing page and a completed
workbench trace on June 27, 2026. Render deployment remains blocked until a
dedicated RAG Lens workspace exists.

## Review Checklist

- The plan implements the V1 product promise without cloning RAG Play.
- Every slice has one clear user-facing or infrastructure outcome.
- Supabase writes are deferred until the local trace loop is useful.
- Upload retention is not optional once uploads exist.
- Provider keys remain server-only.
- Render remains backend/app infrastructure, not the public share URL.
- Tests are relevant to risky logic rather than broad framework coverage.
- Worktree and subagent cleanup are explicit.
