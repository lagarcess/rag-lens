# Testing Strategy

## Foundation

Run:

```bash
bun run lint
bun run build
```

## Unit Tests To Add

Add a test runner in Slice 2 or 3. Candidate: Vitest for pure TypeScript helpers.

Priority unit coverage:

- Base64 int8 embedding decode.
- L2 normalization.
- Chunking boundaries and overlap.
- Prompt assembly.
- Session expiry calculations.
- Upload validation.

## Integration Tests To Add

- Supabase migration applies cleanly.
- `match_rag_chunks` returns ranked chunks.
- Cleanup removes expired rows.
- Query route persists trace records.

## Browser QA

Before public deploy:

- Desktop app shell.
- Mobile collapsed inspector.
- Example corpus query.
- Upload rejection states.
- Session expiry/delete-now flow.
