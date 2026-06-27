# Architecture

## Core Shape

RAG Lens is a Next.js full-stack app designed to deploy on Render.

```mermaid
flowchart LR
  Browser["Browser workbench"] --> Next["Next.js route handlers"]
  Next --> Supabase["Supabase Postgres + Storage"]
  Next --> Perplexity["Perplexity embeddings"]
  Next --> OpenRouter["OpenRouter chat"]
  RenderCron["Render cleanup cron"] --> Supabase
```

## Deferred Public Entry Topology

The long-term shareable portfolio URL should be a static GitHub Pages landing
page, not the Render app URL. Render should be treated as the application/API
origin that powers the sandbox after the visitor chooses to open it.

```mermaid
flowchart LR
  Visitor["Visitor"] --> Pages["GitHub Pages landing"]
  Pages --> Warmup["Health/warmup request"]
  Warmup --> Render["Render app/backend origin"]
  Pages --> Loading["Theme-aware loading interstitial"]
  Loading --> RenderWorkbench["Render /workbench"]
  Render --> Supabase["Supabase Postgres + Storage"]
  Render --> Providers["Model providers"]
```

This is deferred until the workbench is useful enough to share. When added, the
landing page should quietly warm the Render service after first paint, keep the
CTA on the static page, and show a theme-aware RAG Lens loading state if the
sandbox is still starting. The Render URL should remain unlisted and should not
be used as the public link in the README, portfolio, or social posts.

## Runtime Boundaries

### Browser

- Renders workbench UI.
- Holds anonymous `session_id`.
- Never sees service-role keys or Perplexity keys.
- Uploads only through app routes.

### Next.js Server

- Validates env and input.
- Uses Supabase service role from server-only env.
- Calls Perplexity for document and query embeddings.
- Calls OpenRouter for final answer generation.
- Assembles prompts and stores traces.
- Owns upload, ingestion, retrieval, generation, and cleanup endpoints.

### Supabase

- Storage bucket for uploaded files.
- Postgres tables for sessions, corpora, documents, chunks, queries, and retrievals.
- pgvector for vector search.
- RLS enabled on app tables; V1 access goes through server routes.

### Render

- Web service runs the Next.js app.
- Cron job runs `bun run cleanup:sessions` every 30 minutes.
- Deferred: app origin is warmed by the GitHub Pages landing and is not the
  public share URL.

## Why TypeScript First

V1 does not need a Python worker. Keeping ingestion, retrieval, and trace logic in TypeScript reduces deployment surface area and lets the app ship sooner. If PDF extraction becomes unreliable in Node, add a Poetry-managed Python worker as a later slice.

## Key Decisions

- Default embedding dimension is 1024 using Perplexity 0.6b embedding models.
- Default chat generation uses OpenRouter with `deepseek/deepseek-v4-flash`.
- Keep model reasoning disabled by default for low-cost, predictable RAG answers; expose it later as an experiment control.
- Store normalized float vectors in `extensions.vector(1024)`.
- Use cosine distance (`<=>`) in Supabase.
- Use examples by default; uploads are optional and expiring.
- Keep long-lived personal knowledge bases out of V1.
