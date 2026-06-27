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
