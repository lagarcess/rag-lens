# End-to-End Roadmap

The controlling execution plan for V1 is `docs/EXECUTION_PLAN.md`. This file
keeps the product roadmap readable; the execution plan owns commit boundaries,
subagent discipline, verification gates, and cleanup rules.

## Slice 0 - Foundation

Goal: Create the repo, docs, design system, env templates, deployment blueprint, and database schema.

Deliverables:

- Next.js/Bun scaffold.
- `DESIGN.md`.
- Product, architecture, data, API, deployment, security, testing, and examples docs.
- Supabase migration for sessions, corpora, documents, chunks, queries, retrieval traces, and storage bucket.
- Render blueprint with web service and cleanup cron.
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

## Slice 2 - Supabase Connection And Session Lifecycle

Goal: Create anonymous sessions and enforce public-demo retention.

Deliverables:

- Server-only Supabase admin client.
- Anonymous session creation route.
- Session heartbeat route.
- Session delete route.
- Render cleanup script wired to Supabase RPC and Storage object removal.
- UI session badge with expiry and delete-now action.

Verification:

- Create session locally against Supabase.
- Confirm rows have `expires_at` and `hard_expires_at`.
- Run cleanup script against an expired fixture.

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
- README with screenshots and architecture diagram.
- Demo data seeded.
- Environment variable checklist.
- Final browser QA.

Verification:

- Public URL loads.
- Example corpus works without upload.
- Upload session expires and cleans up.
- No secrets in repository or browser bundle.

## Deferred Slice - Static Landing And Warmup

Goal: Make the recruiter-facing URL instant while keeping Render as the
sandbox/app origin rather than the public URL to share.

Deliverables:

- GitHub Pages landing page for the repo.
- Theme-aware RAG Lens loading interstitial.
- Render health/warmup endpoint with narrow CORS for the GitHub Pages origin.
- CTA flow that warms Render, waits when needed, then redirects to `/workbench`.
- Browser-side warmup cooldown to avoid pinging Render on every visit.
- README and portfolio links that point to GitHub Pages, not the Render origin.

Verification:

- Cold Render service is warmed by landing-page visit.
- Warm Render service opens the sandbox quickly.
- Loading interstitial appears only while the sandbox is not ready.
- Warmup endpoint does not create sessions or call model providers.
