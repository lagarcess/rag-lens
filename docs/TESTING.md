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
- Workbench session/upload/query state.

## Integration Tests To Add

- Query route persists trace records.
- Browser-driven upload/query flow with provider fixtures or a disposable
  hosted test project.

## Browser QA

Before public deploy:

- Desktop app shell.
- Mobile collapsed inspector.
- Example corpus query.
- Upload rejection states.
- Session expiry/delete-now flow.
