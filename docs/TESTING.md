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
- Missing browser-reported upload MIME rejection.
- Workbench upload trust summary labels for file and byte limits.
- Upload extraction.
- Upload chunk-row construction and ingestion orchestration.
- Session-scoped vector retrieval RPC arguments.
- Trace persistence row construction, session expiry blocking, summary listing,
  and reload mapping.
- Workbench session/upload/query/history state.
- Workbench experiment baseline/candidate state.
- Experiment comparison helpers for settings, retrieval overlap, prompt deltas,
  and failure-mode notes.
- Trace evidence helpers for selected context and full chunk rows, including
  unretrieved chunks.
- Workbench trace history API helpers.
- Cleanup dry-run behavior and count-only logging helpers.
- Hosted Supabase smoke helper argument parsing, read-only stage orchestration,
  and sanitized error output.
- Hosted Supabase integration smoke helper argument parsing, disposable fixture
  orchestration, cleanup-on-failure, and sanitized count-only output.
- Render deployment preflight package, Blueprint, workspace, and sanitized
  error validation helpers.

## Integration Tests To Add

- Browser-driven upload/query flow with provider fixtures or a disposable hosted
  test project.
- Disposable Supabase cleanup fixture proving expired rows are deleted while
  examples and active sessions remain.

## Hosted Supabase Smoke

Before Render deployment work, run the read-only hosted Supabase smoke gate:

```bash
bun run smoke:supabase -- --json
```

The command verifies the Storage bucket is reachable, first-party example
corpora are seeded, example chunks use the configured standard Perplexity
embedding model, vector retrieval returns rows through `match_rag_chunks`, and
scheduled cleanup can enumerate purgeable upload paths in dry-run mode. Output
is JSON and must remain count/metadata only.

## Hosted Supabase Integration Smoke

Before the first Render deployment, and after any hosted Supabase migration or
storage-policy change, run the explicit mutating integration smoke:

```bash
bun run smoke:supabase:integration -- --json
```

This command creates one disposable anonymous session, uploads one tiny text
fixture through the production upload helper, embeds and indexes it, runs one
uploaded-document vector trace, persists and reloads the trace, purges the
session through the production cleanup helper, and verifies zero remaining
session-scoped rows or Storage objects. It intentionally mutates hosted data;
its JSON output must stay limited to counts and metadata.

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

This check must pass in the dedicated `rag-lens` workspace before any Render
dashboard, Blueprint, or CLI deployment step. It validates local package,
Blueprint, plan-tier, secret-placeholder, and cleanup-cron invariants before it
asks the Render CLI for workspace or Blueprint state. It is expected to fail
while the CLI is pointed at `argus-prod`, `payment-ledger`, or any other
unrelated workspace.

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
