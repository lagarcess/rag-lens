# rag-lens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployed RAG trace workbench that supports examples, temporary uploads, retrieval inspection, answer generation, and experiment mode.

**Architecture:** Next.js App Router handles the workbench UI and server routes. Supabase stores uploads, chunks, vectors, sessions, traces, and scheduled cleanup. Perplexity provides embeddings. OpenRouter provides V1 answer generation. Render hosts the app.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Bun, Supabase, pgvector, Perplexity API, OpenRouter API, Render.

---

## File Structure

- `src/app/page.tsx`: Workbench entry screen.
- `src/app/api/*/route.ts`: Server-only API routes.
- `src/features/session`: Session lifecycle UI and client state.
- `src/features/ingestion`: Upload, extraction, chunking, and ingestion state.
- `src/features/retrieval`: Query, retrieval config, and retrieval results.
- `src/features/trace`: Trace inspector and prompt/citation views.
- `src/lib`: Provider clients, env validation, embedding helpers, shared config.
- `scripts`: Operational scripts such as expired session cleanup.
- `supabase/migrations`: Database schema and RPC functions.
- `docs`: Product, architecture, design, deployment, and implementation guidance.

## Task 1: Finish Foundation

- [x] Initialize Next.js/Bun project.
- [x] Add root design system.
- [x] Add product and architecture docs.
- [x] Add Supabase schema migration.
- [x] Add Render blueprint.
- [x] Add `.env.example` and ignored `.env`.
- [x] Verify lint and production build.
- [x] Commit foundation.

## Task 2: App Shell

- [ ] Replace preview-only shell with reusable components in `src/components/shell`.
- [ ] Create `SourceRail`, `QuestionWorkbench`, and `TraceInspector`.
- [ ] Move static demo data to `src/data/examples`.
- [ ] Verify desktop and mobile layout.
- [ ] Commit app shell.

## Task 3: Session Lifecycle

- [ ] Create `POST /api/sessions`.
- [ ] Create `DELETE /api/sessions/[sessionId]`.
- [ ] Add browser session persistence.
- [ ] Add session badge and delete-now UI.
- [ ] Test session expiry rows in Supabase.
- [ ] Commit session lifecycle.

## Task 4: Example Corpus Seeding

- [ ] Write first-party RAG Concepts Primer documents.
- [ ] Add seed script for example documents.
- [ ] Add chunking for examples.
- [ ] Add contextual embedding call for examples.
- [ ] Confirm seeded example retrieval.
- [ ] Commit example corpus support.

## Task 5: Upload And Extraction

- [ ] Create upload validation.
- [ ] Create `POST /api/uploads`.
- [ ] Store files under `sessions/{session_id}/`.
- [ ] Extract text from PDF/text/markdown.
- [ ] Store `rag_documents` rows with expiry.
- [ ] Render upload status in the source rail.
- [ ] Commit upload and extraction.

## Task 6: Chunking And Embeddings

- [ ] Implement recursive chunking.
- [ ] Add chunk offset and overlap metadata.
- [ ] Decode Perplexity base64 int8 embeddings.
- [ ] Normalize embeddings before pgvector storage.
- [ ] Store `rag_document_chunks`.
- [ ] Render chunk viewer.
- [ ] Commit chunking and embeddings.

## Task 7: Retrieval Trace

- [ ] Create `POST /api/query`.
- [ ] Embed query with standard embedding model.
- [ ] Call `match_rag_chunks`.
- [ ] Persist `rag_queries` and `rag_retrievals`.
- [ ] Render ranked chunks with scores and source metadata.
- [ ] Commit retrieval trace.

## Task 8: Generation And Citations

- [ ] Assemble prompt from selected chunks.
- [ ] Call OpenRouter chat model.
- [ ] Store prompt and answer.
- [ ] Render answer with citations.
- [ ] Add low-confidence behavior when retrieval is weak.
- [ ] Commit generation and citations.

## Task 9: Experiment Mode

- [ ] Add controls for `top_k`, chunk size, overlap, and embedding mode.
- [ ] Store each run as a separate trace.
- [ ] Add side-by-side comparison.
- [ ] Add compact failure-mode explanations.
- [ ] Commit experiment mode.

## Task 10: Deploy And Polish

- [x] Create Supabase project in `RAG Lens` org (`yyqmlfisijerlcrbcuvy`).
- [ ] Apply migrations.
- [ ] Seed examples.
- [ ] Push GitHub remote.
- [ ] Create Render Blueprint services.
- [ ] Configure env vars.
- [ ] Run end-to-end browser QA.
- [ ] Commit deployment polish.

## Self-Review

- Spec coverage: The plan covers examples, uploads, sessions, ingestion, embeddings, retrieval, trace, generation, experiment mode, cleanup, and deployment.
- Placeholder scan: No task depends on unspecified future product decisions.
- Scope check: V1 excludes auth, billing, teams, rerankers, and long-term knowledge bases.
