<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# rag-lens Agent Guide

## Product Direction

`rag-lens` is a practical RAG debugger, not a clone of RAG Play. The first screen should feel like a usable workbench: choose an example corpus or upload a document, ask a question, and inspect the retrieval trace.

The locked promise:

- RAG Play: "Watch the RAG pipeline work."
- rag-lens: "Inspect, debug, and understand a real RAG app built on your own docs."

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS.
- Bun for local package management and scripts.
- Supabase Storage plus Postgres/pgvector for files, chunks, traces, and retrieval.
- Perplexity for embeddings.
- OpenRouter for answer generation.
- Render for deployment, including a web service and cleanup cron.

Do not introduce Python unless the Node/TypeScript ingestion path becomes a proven blocker. If Python is added later, use Poetry.

## Design Direction

Use the root `DESIGN.md`. The chosen visual target is Supabase + Linear + Mintlify:

- Light developer-data shell.
- Dark precision trace panel.
- Emerald/cyan signal accents.
- Geist/Inter-style sans with Geist Mono for code, vectors, prompts, IDs, and scores.
- Dense but readable panels with 6-12px radii and hairline borders.

Avoid copying RAG Play's four-card stage layout. The product surface is the protagonist.

## Provider Safety

- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `PERPLEXITY_API_KEY`, or
  `OPENROUTER_API_KEY` to browser code.
- Treat `SUPABASE_PROJECT_REF` as local Supabase CLI metadata only; do not add
  it to Next.js runtime env or Render service env vars.
- Browser env vars must use only publishable values.
- Public uploads are anonymous demo uploads only and must expire.
- Uploaded files, extracted text, chunks, embeddings, and traces must carry `session_id` plus `expires_at`.

## Docs To Read Before Feature Work

- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/API_CONTRACT.md`
- `docs/SECURITY_PRIVACY.md`
- `docs/ROADMAP.md`
- `DESIGN.md`

For Supabase work, verify current docs before changing migrations or access policies.
