# End-to-End Roadmap

The controlling execution plan for V1 is `docs/EXECUTION_PLAN.md`. This file
keeps the product roadmap readable; the execution plan owns commit boundaries,
subagent discipline, verification gates, and cleanup rules.

## Current V1 State

Core standard RAG is already implemented end to end. Slices 0-11 are complete for
the current V1 baseline: foundation, app shell, Supabase sessions, first-party
examples, uploads, chunking, Perplexity embeddings, Supabase `pgvector`
retrieval, trace persistence/history, OpenRouter answers, experiment mode,
retention cleanup, Render deployment, portfolio documentation, and beginner
trace clarity, plus the public GitHub Pages entry and repository polish.

Only one V1 completion slice remains:

1. **Slice 12 - Final Launch QA**: run the full local, hosted, browser, docs,
   and cleanup verification pass and declare V1 complete only if it passes.

Recommended PR sequence:

1. `codex/public-landing-polish` - merged.
2. `codex/final-launch-qa` - active final QA branch.

Use normal short-lived branches for this sequence. Do not create worktrees by
default; use a worktree only when it materially reduces risk or isolates a
parallel investigation.

## Slice 0 - Foundation

Goal: Create the repo, docs, design system, env templates, deployment blueprint, and database schema.

Deliverables:

- Next.js/Bun scaffold.
- `DESIGN.md`.
- Product, architecture, data, API, deployment, security, testing, and examples docs.
- Supabase migration for sessions, corpora, documents, chunks, queries, retrieval traces, and storage bucket.
- Render blueprint with web service.
- Supabase cleanup schedule and Edge Function.
- Health endpoint.

Status: complete in the initial foundation commit.

## Slice 1 - Local Demo Shell

Goal: Make the first screen feel like the real product before provider calls are wired.

Deliverables:

- App shell with left source rail, center answer canvas, and dark trace inspector.
- Static example corpus cards.
- Mock trace data that mirrors the final data shape.
- Responsive collapse for tablet/mobile.
- Basic accessibility pass.

Verification:

- `bun run lint`
- `bun run build`
- Browser screenshot at desktop and mobile widths.

Status: complete in the deployed V1 baseline.

## Slice 2 - Supabase Connection And Session Lifecycle

Goal: Create anonymous sessions and enforce public-demo retention.

Deliverables:

- Server-only Supabase admin client.
- Anonymous session creation route.
- Session heartbeat route.
- Session delete route.
- Cleanup script and Supabase Edge Function wired to Supabase RPC and Storage
  object removal.
- UI session badge with expiry and delete-now action.

Verification:

- Create session locally against Supabase.
- Confirm rows have `expires_at` and `hard_expires_at`.
- Run cleanup script against an expired fixture.

Status: complete in the deployed V1 baseline.

## Slice 3 - Example Corpora

Goal: Let visitors use the app without uploading private files.

Deliverables:

- First-party `RAG Concepts Primer` corpus.
- First-party evidence retrieval and multi-hop corpora with clear source labels.
- Seed script for examples.
- Example source/citation UI.

Verification:

- Seed script creates documents and chunks.
- Example corpora never receive session expiry.
- UI clearly marks examples as public demo data.

Status: implemented with three first-party corpora: RAG Concepts Primer, Claim
Check Clinic, and Two-Hop Systems Brief. The benchmark-branded placeholder rows
are replaced by a forward migration when they have no seeded documents.

## Slice 4 - Upload And Extraction

Goal: Support small anonymous public uploads safely.

Deliverables:

- Upload route for PDF, `.txt`, and `.md`.
- File size/type validation.
- Supabase Storage write under `sessions/{session_id}/...`.
- Text extraction service.
- Workbench upload state: processing, ready, and failed.
- User-facing privacy warning.
- Delete-now control for anonymous upload sessions.

Verification:

- Reject unsupported file types.
- Reject files beyond limit.
- Uploaded file row carries `session_id` and expiry.
- Delete session removes file metadata and storage objects.

Status: implemented for synchronous upload, extraction, default-profile
chunking, Perplexity embedding, Supabase vector insertion, and rollback on
indexing failure.

## Slice 5 - Chunking And Embeddings

Goal: Convert documents into retrievable chunks.

Deliverables:

- Recursive chunker with size and overlap controls.
- Contextualized Perplexity embedding path for ordered document chunks.
- Standard Perplexity embedding path for queries.
- Base64 int8 decode and L2 normalization before pgvector storage.
- Chunk viewer with source offsets.
- V1 seeded examples use standard embeddings for both document and query
  vectors. Contextualized embeddings require a separate vector profile before
  comparison is enabled.

Verification:

- Chunks preserve source ordering.
- Embeddings are 1024 dimensions for default 0.6b models.
- Query and document embeddings use compatible model family.
- Retrieval uses cosine distance.

Status: implemented for the default standard embedding profile for seeded
examples and uploaded session documents. Contextualized embeddings and dynamic
re-chunking remain deferred until separate vector profiles are tracked.

## Slice 6 - Retrieval And Trace

Goal: Retrieve top chunks and store the complete reasoning trace.

Deliverables:

- `match_rag_chunks` RPC call.
- Retrieval route with `top_k`, threshold, corpus/session scope.
- Trace persistence in `rag_queries` and `rag_retrievals`.
- Trace inspector UI with rank, similarity, source, chunk text, and metadata.

Verification:

- RPC returns ranked chunks.
- Filtering by session or example corpus works.
- Retrieval rows preserve rank order and scores.

Status: implemented for query-time session-scoped vector retrieval and trace
rendering. Uploaded-session queries now persist `rag_queries`,
`rag_retrievals`, prompt text, trace JSON, and retrieval scores for the active
anonymous session.

### Slice 6.1 - Trace History

Goal: Let users reopen traces while their anonymous upload session is active.

Deliverables:

- Persist uploaded-session query traces in Supabase.
- List recent traces in the trace inspector.
- Reload a saved trace without rerunning retrieval or generation.
- Block trace history when the session is expired, deleted, or belongs to a
  different session.

Verification:

- Saved traces reload during an active session.
- Session deletion clears frontend history.
- Service tests cover query/retrieval row construction and expiry blocking.

Status: implemented for session-scoped upload traces. Example traces remain
ephemeral.

## Slice 7 - Answer Generation And Citations

Goal: Generate answers from retrieved context and show citations.

Deliverables:

- Prompt assembly service.
- OpenRouter chat route.
- Answer card with citations linked to chunks.
- Prompt preview in trace inspector.
- "I do not know from this context" behavior when retrieval is weak.

Verification:

- Prompt contains only selected chunks.
- Answer stores model and prompt.
- Citations map to retrieved chunks.

Status: implemented for the current V1 baseline. `/api/query` uses OpenRouter
when configured and falls back to a local extractive answer for local/demo
resilience.

## Slice 8 - Experiment Mode

Goal: Teach RAG tradeoffs by letting users rerun with changed settings.

Deliverables:

- Controls for chunk size, overlap, top-k, and embedding mode.
- Side-by-side trace comparison for two runs.
- Failure-mode notes for low similarity, missing context, and oversized chunks.

Verification:

- Rerun creates separate query trace.
- Comparison UI clearly shows changed parameters and retrieval differences.

Status: implemented locally with a center workbench comparison panel, baseline
pinning, variant reruns, settings diffs, retrieval overlap, prompt-length deltas,
and compact failure-mode notes. Uploaded-document comparisons are currently
query-time only: top-k can change, while chunking and embedding profile changes
require a later re-indexing/profile slice.

## Slice 9 - Deployment And Portfolio Polish

Goal: Ship a public demo suitable for GitHub and recruiter review.

Deliverables:

- Render deployment.
- Supabase hosted project and migrations applied.
- README with architecture diagram and text-first portfolio copy; screenshots
  stay deferred until the UI stabilizes.
- Demo data seeded.
- Environment variable checklist.
- Final browser QA.

Verification:

- Public URL loads.
- Example corpus works without upload.
- Upload session expires and cleans up.
- No secrets in repository or browser bundle.

Status: implemented for the current Render app/backend deployment and
portfolio documentation. Remaining V1 work is public entry polish and final
launch QA, not core RAG infrastructure.

## Slice 10 - Beginner Trace Clarity

Priority: highest. Do this before public launch packaging.

Goal: Make the workbench understandable to visitors who do not already know RAG
terminology while staying focused on standard RAG.

Problem:

- The current center workbench and right trace inspector are technically useful
  but assume the user can already interpret terms like `top_k`, chunk overlap,
  similarity score, prompt length, embedding mode, and shared chunks.
- The comparison panel shows accurate A/B data, but it needs an explicit
  "what changed / did it help / why" summary for first-time RAG learners.
- Locked upload controls are technically correct, but the reason should be
  easier to understand without knowing how indexing works.

Deliverables:

- Plain-language trace summaries above technical metrics that explain what was
  found, what was sent to the prompt, and why it matters.
- Collapsible "What this means" explanations for chunking, embeddings,
  retrieval, prompt assembly, and answer generation.
- Beginner labels or tooltips for `top_k`, chunk size, chunk overlap,
  embeddings, cosine similarity, prompt assembly, citations, and prompt length.
- A compact RAG concepts glossary drawer or modal only if inline explanations
  are not enough; avoid turning the workbench into a separate tutorial.
- Trace comparison verdicts that state whether the variant improved retrieval,
  changed selected evidence, expanded the prompt, weakened grounding, or had no
  practical effect.
- Similarity score bars and clearer selected/not-selected chunk states.
- Example-guided "Try this" prompts for first-time users using the first-party
  corpora.
- Right-panel progressive disclosure: concise stage overview first, chunk IDs,
  metadata, and prompt details second.
- Clear locked-state explanation for uploads: chunk size, overlap, and
  embedding mode are fixed after upload because changing them requires
  re-chunking and re-embedding the uploaded file.

Verification:

- A non-RAG user can explain what happened after one example query.
- A/B comparison includes an answer in plain English before raw metrics.
- Locked upload controls explain what is locked, why, and what can still be
  changed.
- Browser QA covers empty state, completed trace, comparison, and upload mode.
- `bun test`, `bun run lint`, `bun run build`, and `git diff --check` pass.

Status: complete in `codex/beginner-trace-clarity`. The workbench now includes
plain-English retrieval verdicts, guided example prompts, inline RAG concept
help, collapsible stage explanations, similarity bars, selected/retrieved chunk
states, and comparison verdicts with practical tradeoff handling. Verification
passed with `bun run lint`, `bun test`, `bun run build`, `git diff --check`,
desktop/mobile browser QA, and a pre-merge code-review pass.

## Slice 11 - Public Landing And Repo Polish

Priority: complete. Slice 10 is complete, so public entry points can send
visitors to the strongest product surface.

Goal: Make the recruiter-facing URL instant while keeping Render as the
sandbox/app origin rather than the public URL to share.

Deliverables:

- GitHub Pages landing page for the repo.
- Theme-aware RAG Lens loading interstitial.
- Render health/warmup endpoint with narrow CORS for the GitHub Pages origin.
- CTA flow that warms Render, waits when needed, then redirects to `/workbench`.
- Browser-side warmup cooldown to avoid pinging Render on every visit.
- README and portfolio links that point to GitHub Pages, not the Render origin.
- README hero section with product tagline, screenshots or GIFs of the trace
  inspector, quickstart, "what you will learn", architecture highlights, live
  demo link, and portfolio narrative.
- GitHub repository description, topics, and banner image aligned to the
  standard RAG debugger positioning.
- Clear privacy and rate-limit messaging around temporary anonymous uploads.

Verification:

- Cold Render service is warmed by landing-page visit.
- Warm Render service opens the sandbox quickly.
- Loading interstitial appears only while the sandbox is not ready.
- Warmup endpoint does not create sessions or call model providers.
- README links, screenshots, and setup steps are current.
- Browser QA covers the landing page, warmup/loading path, desktop workbench,
  mobile workbench, example query, upload rejection states, and delete-now flow.
- `bun test`, `bun run lint`, `bun run build`, `bun run preflight:render`, and
  `git diff --check` pass before launch.

Status: complete and merged. The Slice 11 PR added the static GitHub Pages
entry, Next landing polish, cheap `/api/warmup` route with narrow CORS,
browser-side cooldown, docs/repo polish, and privacy/rate-limit messaging.
Verification passed with focused warmup/static-entry tests, `bun test`,
`bun run lint`, `bun run build`, `bun run preflight:render`,
`git diff --check`, and browser QA across desktop/mobile public entry, Next
landing, and workbench. GitHub Pages is enabled from `/docs` on `main`, the
repo homepage/topics are updated, and Render has the Pages warmup origin env.

## Slice 12 - Final Launch QA

Goal: Confirm the standard RAG debugger is portfolio-ready end to end and stop
adding V1 scope.

Deliverables:

- Full verification pass for the deployed app and local repo.
- Manual smoke tests with example corpora, small text/markdown uploads, PDF
  upload success, oversized upload rejection, wrong MIME rejection, session
  expiry messaging, and delete-now cleanup.
- Hosted Supabase smoke and integration smoke remain count-only and leave no
  fixture data behind.
- Final docs alignment across README, product, architecture, API contract,
  security, deployment, testing, roadmap, and project lock.
- Known limitations remain explicit and do not read like accidental omissions.
- Optional lightweight monitoring/analytics is limited to free-tier operational
  visibility and must not expand the product surface.

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

Status: active on `codex/final-launch-qa`. The branch fixes a production-only
PDF upload failure by keeping `pdf-parse` external to the Next.js server bundle,
adds a regression test for that config contract, and records final QA evidence.
`bun test`, `bun run lint`, `bun run build`, `bun run preflight:render`,
hosted Supabase smoke, hosted Supabase integration smoke, and
`git diff --check` pass on the branch. Local production API smoke has passed
example corpus query, markdown upload, PDF upload, wrong MIME rejection,
oversized upload rejection, expired-session messaging, and delete-now cleanup.
Hosted Supabase read-only and mutating integration smokes have passed with
count-only output and no remaining fixture data.

## Done Criteria

RAG Lens V1 is done when:

- A visitor can open the public entry point, reach the Render workbench, choose
  an example or upload temporary documents, ask a question, inspect the trace,
  understand what happened without prior RAG vocabulary, compare standard RAG
  settings, and delete their anonymous session.
- The app demonstrates standard RAG end to end: ingestion, chunking, embeddings,
  Supabase `pgvector` retrieval, prompt assembly, OpenRouter answer generation,
  citations, trace persistence for uploaded sessions, retention, cleanup, and
  deployment discipline.
- The README and docs clearly explain the product promise, architecture,
  security model, local setup, hosted deployment, demo flow, known limitations,
  and portfolio narrative.
- The public share link is the static landing page, while Render remains the
  app/backend sandbox origin.
- Final verification commands and browser QA pass with evidence.
- No deferred scope below is required to call V1 complete.

## Explicitly Deferred After V1

- Re-indexed embedding profiles and dynamic upload re-chunking experiments.
- Contextualized embedding comparisons beyond the current standard vector
  profile.
- Agentic RAG, GraphRAG, multimodal RAG, rerankers, and advanced eval suites.
- User accounts, team collaboration, billing, or long-term personal knowledge
  bases.
- Distributed production rate limiting beyond the current V1 public-demo abuse
  brake.

## Branch And Review Policy

This roadmap lock may be committed directly to `main` because it is docs-only.
After this commit, new product, code, infrastructure, and substantive docs work
should happen on short-lived `codex/` branches and move through pull requests
for review before merging to `main`, unless the user explicitly authorizes a
direct-to-main exception.
