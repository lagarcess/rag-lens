# Product Brief

## Promise

RAG Lens helps developers learn RAG by inspecting a working RAG system, not by reading a static tutorial.

RAG Play: "Watch the RAG pipeline work."

RAG Lens: "Inspect, debug, and understand a real RAG app built on your own docs."

## Audience

- Recruiters evaluating full-stack AI project depth.
- Developers learning RAG internals.
- Builders who want to see where retrieval succeeds or fails.

## V1 Outcome

A visitor can:

1. Open a deployed app.
2. Choose a curated example corpus or upload up to three small documents.
3. Ask a question.
4. See an answer with citations.
5. Inspect the trace: document extraction, chunks, embeddings, retrieval scores, selected context, prompt assembly, and model response.
6. Adjust basic retrieval settings and rerun the trace.

## Non-Goals For V1

- Multi-user SaaS accounts.
- Long-term personal knowledge bases.
- Billing.
- Team collaboration.
- Advanced rerankers.
- Agent workflows.
- Large-scale document ingestion.

## Differentiation From RAG Play

- Real user-owned documents, with safe public cleanup.
- Persistent trace records in Supabase.
- Supabase pgvector instead of browser-only vector operations.
- Perplexity standard/contextual embeddings comparison.
- Debugger/workbench layout instead of tutorial stage cards.
