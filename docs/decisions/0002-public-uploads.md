# Decision 0002: Examples First, Expiring Uploads Second

## Decision

The public app starts with curated examples and also allows strict anonymous uploads.

## Rationale

Examples make the recruiter demo reliable. Uploads make the app real and distinguish it from static RAG explainers.

## Policy

- Default to examples.
- Uploads are optional.
- Anonymous sessions expire after 2 hours.
- Abandoned uploads become purge-eligible after about 24 hours and are
  physically purged by a monthly Supabase cleanup batch.
- Users can delete their session immediately; delete-now removes Storage
  objects first, then session-scoped database rows.
- Cleanup scheduling is owned by Supabase Cron, not Render.
