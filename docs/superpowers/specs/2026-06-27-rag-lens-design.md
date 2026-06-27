# rag-lens Design Spec

## Goal

Build a deployed, recruiter-facing RAG debugger that teaches RAG through a real inspectable workflow.

## Locked Direction

rag-lens is a practical RAG debugger: upload your own docs, persist them for a temporary session, query them, and show a trace of exactly what happened.

## V1 Scope

- Example corpora are the default demo path.
- Anonymous public uploads are allowed with strict limits and cleanup.
- Every answer has a trace: extraction, chunking, embeddings, retrieval, prompt assembly, answer, and citations.
- Experiment mode compares chunk size, overlap, top-k, and embedding mode.

## Architecture

Next.js owns UI and server routes. Supabase owns Storage, Postgres, pgvector, and trace persistence. Perplexity owns embeddings. OpenRouter owns V1 answer generation. Render owns deployment and cleanup cron.

## Visual System

Use `DESIGN.md`. The locked style is Supabase + Linear + Mintlify: light developer-data shell, dark trace inspector, emerald/cyan signal accents, mono-heavy traces, and compact educational notes.

## Public Upload Policy

Anonymous uploads are temporary and session-scoped. The app must expose expiry and delete-now controls. Cleanup must remove storage objects and database rows.

## Implementation Slices

Use `docs/ROADMAP.md` as the end-to-end slice list and `docs/superpowers/plans/2026-06-27-rag-lens-implementation-plan.md` for the working plan.
