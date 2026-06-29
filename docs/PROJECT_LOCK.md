# Project Lock

This document records the decisions that should guide future RAG Lens work. If
the implementation changes one of these, update this file in the same slice.

## Product Promise

RAG Lens is a practical RAG debugger, not a RAG Play clone.

- RAG Play: "Watch the RAG pipeline work."
- RAG Lens: "Inspect, debug, and understand a real RAG app built on your own
  docs."

The V1 workflow is:

1. Choose an example corpus or upload temporary documents.
2. Ask a question.
3. Inspect the answer, citations, selected chunks, similarity scores, prompt,
   and trace metadata.
4. Compare retrieval settings where the selected source supports the profile.

## Stack Decisions

- Use Next.js App Router, React, TypeScript, and Tailwind CSS.
- Use Bun for frontend package management and scripts.
- Use Supabase Storage, Postgres, and `pgvector` for uploaded files, chunks,
  retrieval, traces, and retention.
- Use Perplexity for embeddings.
- Use OpenRouter for V1 answer generation.
- Use Render for the backend app service only from the dedicated `rag-lens`
  workspace.
- Use Supabase Cron plus a Supabase Edge Function for scheduled abandoned-upload
  cleanup.
- Do not introduce Python unless the TypeScript ingestion path becomes a proven
  blocker. If Python is added later, use Poetry.

## Public Demo Safety

- Anonymous uploads are temporary, session-scoped, size-limited, and expire.
- Uploaded files, extracted text, chunks, embeddings, queries, retrieval rows,
  and traces must carry `session_id` and `expires_at`.
- The browser must never receive `SUPABASE_SERVICE_ROLE_KEY`,
  `PERPLEXITY_API_KEY`, or `OPENROUTER_API_KEY`.
- Cleanup must remove both database rows and storage objects.
- Session access expires quickly, manual delete is immediate, and abandoned
  uploads are purged by a monthly Supabase cleanup batch.
- V1 bundled examples are first-party unless a future slice explicitly records a
  third-party license review.

## Deployment Lock

The Supabase project belongs in the dedicated `RAG Lens` organization. Render
services must not be created in unrelated workspaces. The dedicated Render
workspace is `rag-lens` (`tea-d8vvqob7uimc738uflsg`). Run
`bun run preflight:render` before any Render dashboard, Blueprint, CLI creation,
or service update workflow. The guard must validate local package scripts,
hosted Blueprint shape, web `free` plan, absence of Render cron services,
secret placeholders, and the active Render workspace. Once the dedicated
workspace exists, pin `RENDER_EXPECTED_WORKSPACE_ID` locally so the guard does
not rely on name-only matching.

The public-entry topology for Slice 11 is:

- GitHub Pages hosts the shareable landing page.
- The landing page warms the Render sandbox after first paint.
- If Render is cold, the CTA shows a theme-aware RAG Lens loading state before
  opening `/workbench`.
- The Render URL is the app/backend origin, not the public portfolio URL.

Public links in the README, portfolio materials, repository homepage, and
social posts should point to `https://lagarcess.github.io/rag-lens/`, not the
Render origin. The current Render origin remains
`https://rag-lens-mx20.onrender.com` and should be described as infrastructure
or sandbox/backend origin only.

## Repository Presentation Lock

Use standard RAG debugger positioning for public repository metadata:

- GitHub homepage: `https://lagarcess.github.io/rag-lens/`.
- GitHub description: `Inspect, debug, and understand a real RAG app built on your own docs.`
- Recommended topics: `rag`, `rag-debugger`,
  `retrieval-augmented-generation`, `vector-search`, `pgvector`, `supabase`,
  `nextjs`, `openrouter`, `perplexity`, `ai-engineering`.
- Social preview/banner image: use an actual RAG Lens workbench or trace
  inspector image. Do not use stock AI art or a generic marketing graphic.
  `docs/assets/screenshots/workbench.png` is the current source asset.

## Execution Discipline

- Work in cohesive slices that can be committed independently.
- The roadmap lock commit is allowed to land directly on `main` because it is
  docs-only and explicitly authorized. After that, new product, code,
  infrastructure, and substantive docs work should use normal short-lived
  `codex/` branches and pull requests for review before merging to `main`,
  unless the user explicitly authorizes another direct-to-main exception.
- Do not default to worktrees. Use a worktree only when it materially reduces
  risk or isolates a parallel investigation; otherwise branch in the current
  checkout.
- Use non-overlapping subagents for independent docs, UI, backend, database, or
  verification tasks.
- Give each subagent a disjoint scope and close it when its report is consumed.
- Avoid temporary worktrees unless they materially reduce risk. If a temporary
  worktree is created, remove it and any generated dependency/build artifacts
  before the slice is closed.
- Run focused tests for changed logic, then run `bun test`, `bun run lint`,
  `bun run build`, and `git diff --check` before committing a complete slice.
- Do not deploy, create, or delete cloud resources in the wrong organization or
  workspace.
- Treat a failing Render preflight as a hard stop for Render service creation.

## Reviewed State

As of June 28, 2026:

- Supabase is linked to the dedicated RAG Lens project.
- Supabase migrations are applied and advisors report no warning-level issues.
- Render blueprint validation passes locally and hosted V1 is configured to use
  Supabase vector retrieval.
- `bun run preflight:render` is the required local package, Blueprint, and
  workspace guard before Render cloud resource changes.
- Render service now lives in the dedicated `rag-lens` workspace:
  `rag-lens` (`srv-d900drho3t8c73bpvr80`).
- The current Render web URL is `https://rag-lens-mx20.onrender.com`.
- Public route hardening, upload cleanup, trace persistence, experiment
  comparison, and beginner trace clarity slices are implemented and committed.
- Slice 11 public landing and repo polish are merged. GitHub Pages is enabled
  from `/docs` on `main`, repository metadata points to the Pages URL, and the
  Render warmup route allows the Pages origin.
- Slice 12 final launch QA is merged. Render deploy
  `dep-d90r8l1kh4rs739moscg` is live for merge commit `80b5b6e`, and hosted
  smoke passed Pages, warmup CORS, default-profile example query,
  markdown/PDF uploads, rejection states, expired-session messaging, and
  delete-now cleanup.
- V1 standard RAG debugger scope is complete. Re-indexed profiles, GraphRAG,
  agentic RAG, accounts, long-term knowledge bases, advanced evals, and
  distributed production rate limiting remain post-V1 deferred scope.
