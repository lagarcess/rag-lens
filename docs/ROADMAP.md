# End-to-End Roadmap

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
- Small attributed dataset subsets for SciFact and HotpotQA after license review.
- Seed script for examples.
- Example source/citation UI.

Verification:

- Seed script creates documents and chunks.
- Example corpora never receive session expiry.
- UI clearly marks examples as public demo data.

## Slice 4 - Upload And Extraction

Goal: Support small anonymous public uploads safely.

Deliverables:

- Upload route for PDF, `.txt`, and `.md`.
- File size/type validation.
- Supabase Storage write under `sessions/{session_id}/...`.
- Text extraction service.
- Ingestion status states: pending, processing, ready, failed.
- User-facing privacy warning.

Verification:

- Reject unsupported file types.
- Reject files beyond limit.
- Uploaded file row carries `session_id` and expiry.
- Delete session removes file metadata and storage objects.

## Slice 5 - Chunking And Embeddings

Goal: Convert documents into retrievable chunks.

Deliverables:

- Recursive chunker with size and overlap controls.
- Contextualized Perplexity embedding path for ordered document chunks.
- Standard Perplexity embedding path for queries.
- Base64 int8 decode and L2 normalization before pgvector storage.
- Chunk viewer with source offsets.

Verification:

- Chunks preserve source ordering.
- Embeddings are 1024 dimensions for default 0.6b models.
- Query and document embeddings use compatible model family.
- Retrieval uses cosine distance.

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

## Slice 7 - Answer Generation And Citations

Goal: Generate answers from retrieved context and show citations.

Deliverables:

- Prompt assembly service.
- Perplexity chat route.
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
