# Security And Privacy

## Public Upload Policy

V1 supports anonymous uploads only as temporary demos.

Rules:

- Show a warning before upload: do not upload secrets, private files, or personal data.
- Limit anonymous sessions to 3 files and 10 MB total.
- Restrict file types to PDF, text, and markdown.
- Require the browser-reported MIME type to match the file extension and run a
  lightweight content check before extraction.
- Store every upload under a session-scoped path.
- Attach `session_id`, `expires_at`, and `hard_expires_at` to all derived rows.
- Delete anonymous uploads within 24 hours.
- Let users delete the session immediately.
- Run Render cleanup every 30 minutes.

## Secret Handling

Never expose these to browser code:

- `SUPABASE_SERVICE_ROLE_KEY`
- `PERPLEXITY_API_KEY`

Only `NEXT_PUBLIC_*` values can appear in client bundles.

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
3. Call `delete_expired_rag_rows`.
4. Log counts only, never file contents.

## Dataset Safety

Curated examples must be small, attributed, and license-reviewed before text is bundled in the repo or seeded into Supabase.
