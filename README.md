# rag-lens

`rag-lens` is a practical RAG debugger: upload documents, ask a question, and inspect exactly how retrieval produced the answer.

The project is inspired by RAG Play's educational clarity, but it is not a clone. RAG Play shows the pipeline as a demo. rag-lens turns the pipeline into a deployed workbench with real documents, persistent session traces, Supabase vector search, and Perplexity-backed generation.

## Locked V1

Build a polished recruiter-facing app optimized for learning:

- Bring your own docs with strict anonymous-session cleanup.
- Curated example corpora for visitors who do not have files.
- Full RAG trace viewer: extraction, chunks, embeddings, retrieval scores, prompt assembly, response, and citations.
- Experiment controls for chunk size, overlap, top-k, and standard vs contextualized embeddings.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS.
- Bun for package management.
- Supabase Storage + Postgres + pgvector.
- Perplexity embeddings and chat APIs.
- Render web service plus cleanup cron.

## Getting Started

```bash
bun install
cp .env.example .env
bun run dev
```

Open `http://localhost:3000`.

## Project Docs

- `DESIGN.md` - visual design system.
- `docs/PRODUCT.md` - product promise and scope.
- `docs/ROADMAP.md` - end-to-end implementation slices.
- `docs/ARCHITECTURE.md` - system architecture and boundaries.
- `docs/DATA_MODEL.md` - Supabase schema and retention model.
- `docs/API_CONTRACT.md` - app route/API surface.
- `docs/SECURITY_PRIVACY.md` - public upload and secret-handling rules.
- `docs/DEPLOYMENT.md` - Supabase and Render setup.
- `docs/EXAMPLE_CORPORA.md` - curated demo data plan.

## Current Status

Foundation is initialized and deployed.

- GitHub: https://github.com/lagarcess/rag-lens
- Render: https://rag-lens.onrender.com
- Supabase: `rag-lens` project `ycdvnvsosghbcgreosry`

Secrets still needed for full RAG behavior:

- `SUPABASE_SERVICE_ROLE_KEY`
- `PERPLEXITY_API_KEY`
