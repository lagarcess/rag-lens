# Decision 0002: Examples First, Expiring Uploads Second

## Decision

The public app starts with curated examples and also allows strict anonymous uploads.

## Rationale

Examples make the recruiter demo reliable. Uploads make the app real and distinguish it from static RAG explainers.

## Policy

- Default to examples.
- Uploads are optional.
- Anonymous sessions expire after 2 hours and hard-expire after 23.5 hours so
  the 30-minute cleanup cadence still fits the 24-hour deletion promise.
- Users can delete their session immediately.
- Cleanup runs every 30 minutes.
