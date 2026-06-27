# Testing Strategy

## Foundation

Run:

```bash
bun test
bun run lint
bun run build
```

## Current Unit Coverage

The Bun test suite covers:

- Base64 int8 embedding decode.
- L2 normalization.
- First-party example corpus manifest, file loading, and seedable slug list.
- Public API throttling before expensive session, upload, query, provider, and
  database paths.
- Public-safe API error responses for query setup failures.
- Server-runtime assertions for secret-bearing modules.
- Chunking boundaries and overlap.
- Prompt assembly.
- Session expiry calculations.
- Anonymous session retention env parsing.
- Upload validation.
- Upload extraction.
- Upload chunk-row construction and ingestion orchestration.
- Session-scoped vector retrieval RPC arguments.
- Trace persistence row construction, session expiry blocking, summary listing,
  and reload mapping.
- Workbench session/upload/query/history state.
- Workbench experiment baseline/candidate state.
- Experiment comparison helpers for settings, retrieval overlap, prompt deltas,
  and failure-mode notes.
- Workbench trace history API helpers.
- Cleanup dry-run behavior and count-only logging helpers.
- Render deployment preflight workspace and Blueprint validation helpers.

## Integration Tests To Add

- Browser-driven upload/query flow with provider fixtures or a disposable
  hosted test project.
- Disposable Supabase cleanup fixture proving expired rows are deleted while
  examples and active sessions remain.

## Browser QA

Before public deploy:

- Desktop app shell.
- Mobile collapsed inspector.
- Example corpus query.
- Upload rejection states.
- Session expiry/delete-now flow.

## Deployment Preflight

Before creating or updating Render services, run:

```bash
bun run preflight:render
```

This check must pass in the dedicated `RAG Lens` workspace before any Render
dashboard, Blueprint, or CLI deployment step. It is expected to fail while the
CLI is pointed at `argus-prod`, `payment-ledger`, or any other unrelated
workspace.

## Portfolio QA Status

Last checked on June 27, 2026:

- Local health endpoint returned `200` with `{"ok":true}`.
- Landing page screenshot captured at `docs/assets/screenshots/landing.png`.
- Workbench example query completed with an OpenRouter answer and visible trace
  inspector.
- Workbench source list showed RAG Concepts Primer, Claim Check Clinic, and
  Two-Hop Systems Brief as ready example corpora with no benchmark-branded
  placeholders.
- Two-Hop Systems Brief query completed with an OpenRouter answer, three
  retrieved chunks, and no browser error-level console logs.
- Workbench screenshot captured at `docs/assets/screenshots/workbench.png`.
- Browser console had no error-level logs on the captured workbench view.
