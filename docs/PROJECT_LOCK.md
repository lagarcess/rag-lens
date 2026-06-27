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
- Use Render for the backend app service and cleanup cron once a dedicated RAG
  Lens workspace is available.
- Do not introduce Python unless the TypeScript ingestion path becomes a proven
  blocker. If Python is added later, use Poetry.

## Public Demo Safety

- Anonymous uploads are temporary, session-scoped, size-limited, and expire.
- Uploaded files, extracted text, chunks, embeddings, queries, retrieval rows,
  and traces must carry `session_id` and `expires_at`.
- The browser must never receive `SUPABASE_SERVICE_ROLE_KEY`,
  `PERPLEXITY_API_KEY`, or `OPENROUTER_API_KEY`.
- Cleanup must remove both database rows and storage objects.
- V1 bundled examples are first-party unless a future slice explicitly records a
  third-party license review.

## Deployment Lock

The Supabase project belongs in the dedicated `RAG Lens` organization. Render
services must not be created in unrelated workspaces. Deployment is blocked
until a dedicated RAG Lens Render workspace is available.

The deferred portfolio topology is:

- GitHub Pages hosts the shareable landing page.
- The landing page warms the Render sandbox after first paint.
- If Render is cold, the CTA shows a theme-aware RAG Lens loading state before
  opening `/workbench`.
- The Render URL is the app/backend origin, not the public portfolio URL.

## Execution Discipline

- Work in cohesive slices that can be committed independently.
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

## Reviewed State

As of June 27, 2026:

- Supabase is linked to the dedicated RAG Lens project.
- Supabase migrations are applied and advisors report no warning-level issues.
- Render blueprint validation passes locally.
- Render deployment is intentionally blocked by missing dedicated workspace
  access.
- Public route hardening, upload cleanup, trace persistence, and experiment
  comparison slices are implemented and committed.
