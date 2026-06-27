# Data Model

## Tables

### `rag_sessions`

Anonymous public-demo sessions. Sessions expire automatically and own uploaded documents, chunks, queries, and retrievals.

Important columns:

- `id`
- `mode`
- `status`
- `expires_at`
- `hard_expires_at`
- `deleted_at`

### `rag_corpora`

Curated example corpora. These do not expire.

Important columns:

- `slug`
- `title`
- `description`
- `source_name`
- `source_url`
- `license`

### `rag_documents`

One uploaded or example document.

Important columns:

- `session_id` for uploads.
- `corpus_slug` for examples.
- `source_kind`: `upload` or `example`.
- `storage_path`.
- `extracted_text`.
- `status`.
- `expires_at`.
- `hard_expires_at`.

### `rag_document_chunks`

Chunked document text plus embeddings.

Important columns:

- `document_id`
- `chunk_index`
- `content`
- `char_start`
- `char_end`
- `embedding_model`
- `embedding_mode`
- `embedding vector(1024)`
- `metadata`
- `expires_at` and `hard_expires_at` for uploaded/session chunks.

### `rag_queries`

One user question and answer trace.

Important columns:

- `question`
- `answer`
- `answer_model`
- `embedding_model`
- `top_k`
- `chunk_size`
- `chunk_overlap`
- `prompt`
- `trace`
- `expires_at` and `hard_expires_at` for session traces.

### `rag_retrievals`

Ranked chunks for a query.

Important columns:

- `query_id`
- `chunk_id`
- `rank`
- `similarity`
- `distance`
- `selected`
- `session_id`, `expires_at`, and `hard_expires_at` for session-derived rows.

## Vector Policy

Perplexity default int8 embeddings are unnormalized. The application decodes base64 int8 embeddings, converts to numbers, L2-normalizes them, and stores normalized float vectors.

V1 uses 1024-dimension Perplexity 0.6b models because pgvector HNSW supports regular vector indexes up to 2,000 dimensions. The 2,560-dimension 4b models require a halfvec strategy and are deferred.

## Retention

Examples:

- `session_id` is null.
- `expires_at` is null.
- `hard_expires_at` is null.
- Never deleted by cleanup.

Uploads:

- `session_id` is required.
- `expires_at` is required and marks active demo expiry.
- `hard_expires_at` is required and marks the physical purge deadline.
- Anonymous upload files and derived rows are scheduled for purge by 23.5 hours,
  leaving the 30-minute cleanup cadence inside the 24-hour deletion promise.
- Cleanup removes Storage files before database rows and scopes row deletion to
  the Storage paths processed in that run.
