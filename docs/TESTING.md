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
- Chunking boundaries and overlap.
- Prompt assembly.
- Session expiry calculations.
- Upload validation.
- Upload extraction.
- Upload chunk-row construction and ingestion orchestration.
- Session-scoped vector retrieval RPC arguments.
- Trace persistence row construction, session expiry blocking, summary listing,
  and reload mapping.
- Workbench session/upload/query/history state.
- Workbench trace history API helpers.

## Integration Tests To Add

- Browser-driven upload/query flow with provider fixtures or a disposable
  hosted test project.

## Browser QA

Before public deploy:

- Desktop app shell.
- Mobile collapsed inspector.
- Example corpus query.
- Upload rejection states.
- Session expiry/delete-now flow.
