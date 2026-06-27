# Security And Privacy

## Public Upload Policy

V1 supports anonymous uploads only as temporary demos.

Rules:

- Show a warning before upload: do not upload secrets, private files, or personal data.
- Limit anonymous sessions to 3 files and 10 MB total.
- Restrict file types to PDF, text, and markdown.
- Require the browser-reported MIME type to match the file extension and run a
  lightweight content check before extraction.
- Apply an in-memory public API throttle before public session lifecycle writes,
  upload parsing, retrieval, embedding, or chat provider calls.
- Store every upload under a session-scoped path.
- Attach `session_id`, `expires_at`, and `hard_expires_at` to all derived rows.
- Roll back Storage and document rows if extraction, embedding, or chunk
  insertion fails.
- Schedule anonymous uploads for purge at 23.5 hours so the 30-minute cleanup
  cadence stays inside the 24-hour deletion promise.
- Let users delete the session immediately. Delete-now marks the session
  deleted, removes known Storage objects first, and then deletes the
  session-scoped database rows.
- Use scheduled cleanup as the backstop for abandoned sessions and for
  delete-now attempts whose immediate cleanup cannot be confirmed.
- Run Render cleanup every 30 minutes.

## Secret Handling

Never expose these to browser code:

- `SUPABASE_SERVICE_ROLE_KEY`
- `PERPLEXITY_API_KEY`
- `OPENROUTER_API_KEY`

Only `NEXT_PUBLIC_*` values can appear in client bundles.

Server-only modules assert that they are not running in a browser runtime before
parsing secret-bearing env vars or creating the Supabase service-role client.

## Supabase Access

- Enable RLS on every public table.
- V1 browser access goes through server routes.
- Explicitly grant V1 table/function access only to `service_role`.
- Do not add broad `anon` policies.
- Do not grant broad `anon` or `authenticated` Data API access in V1.
- If direct browser reads are added later, write narrow RLS policies and test them.

## Data Cleanup

Cleanup order:

1. Query hard-expired upload documents and documents from deleted sessions.
2. Remove Supabase Storage objects by path.
3. Call `delete_expired_rag_rows` with only the Storage paths processed in
   that run.
4. Log counts only, never file contents.

Immediate delete-now cleanup uses the same Storage-before-database ordering but
is scoped to the requested anonymous session. If Storage removal fails, database
row deletion is skipped so scheduled cleanup can retry from the remaining
session-scoped rows.

Use `bun run cleanup:sessions:dry-run` before enabling or changing scheduled
cleanup. Dry-run emits only counts and performs no Storage or database deletes.

## Dataset Safety

Curated examples must be small and clearly attributed. V1 bundled examples are
first-party text written for RAG Lens. Third-party benchmark text requires
explicit license review before it is bundled in the repo or seeded into
Supabase.
