# Decision 0002: Examples First, Expiring Uploads Second

## Decision

The public app starts with curated examples and also allows strict anonymous uploads.

## Rationale

Examples make the recruiter demo reliable. Uploads make the app real and distinguish it from static RAG explainers.

## Policy

- Default to examples.
- Uploads are optional.
- Anonymous sessions expire after 2 hours and hard-expire after 24 hours.
- Users can delete their session immediately.
- Cleanup runs every 30 minutes.
