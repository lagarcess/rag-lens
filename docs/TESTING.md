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
- Next.js production server configuration keeps PDF extraction dependencies
  external to the server bundle.

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

## Public Entry QA

Slice 11 public-entry QA covers:

- GitHub Pages public entry loads at
  `https://lagarcess.github.io/rag-lens/`.
- The public entry starts a cheap Render warmup after first paint.
- Warmup uses narrow CORS for the GitHub Pages origin.
- Warmup does not create sessions, upload data, run retrieval, or call model
  providers.
- The CTA opens `/workbench` quickly when Render is warm.
- The theme-aware loading interstitial appears only while the sandbox is still
  waking.
- Browser-side cooldown prevents a warmup request on every page view.
- README links and screenshots match the deployed public entry and workbench.
- Browser QA covers desktop landing, mobile landing, desktop workbench, mobile
  workbench, example query, upload rejection states, and delete-now flow.

## Deployment Preflight

Before creating or updating Render services, run:

```bash
bun run preflight:render
```

This check must pass in the dedicated `rag-lens` workspace before any Render
dashboard, Blueprint, or CLI deployment step. It validates local package,
Blueprint, plan-tier, secret-placeholder, and no-Render-cron invariants before it
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

Slice 11 status on June 28, 2026: merged to `main`, GitHub Pages enabled from
`/docs`, repository homepage/topics updated, and Render redeployed with the
Pages warmup origin. Live checks confirmed the Pages URL, warmup CORS for
`https://lagarcess.github.io`, blocked broad CORS for other origins, and a
theme-aware loading path.

Slice 12 final launch QA on June 28, 2026:

- `next.config.ts` externalizes `pdf-parse`; a regression test covers that
  production bundle contract.
- `bun test`, `bun run lint`, `bun run build`, `bun run preflight:render`,
  hosted Supabase smoke, hosted Supabase integration smoke, and
  `git diff --check` passed on `codex/final-launch-qa`.
- Local `next start` API smoke passed example corpus query, markdown upload,
  PDF upload, wrong MIME rejection, oversized upload rejection, expired-session
  messaging, and delete-now cleanup.
- Hosted Supabase read-only smoke and mutating integration smoke passed with
  count-only output and zero remaining fixture rows or Storage objects.
- PR #3 merged to `main` as `80b5b6e`, then Render deploy
  `dep-d90r8l1kh4rs739moscg` succeeded for that commit.
- Post-merge hosted smoke confirmed GitHub Pages `200`, warmup CORS for
  `https://lagarcess.github.io`, no broad CORS reflection, default-profile
  example query success, markdown upload, PDF upload, wrong MIME rejection,
  oversized upload rejection, expired-session messaging, and delete-now cleanup.
- Headless Chrome screenshots confirmed the live Pages desktop entry and hosted
  workbench mobile view render nonblank.
