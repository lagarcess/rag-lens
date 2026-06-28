# API Contract

All mutable RAG operations go through Next.js route handlers. Browser code never writes directly to Supabase in V1.

## Implemented

### `GET /api/health`

Returns service health.

Response:

```json
{
  "ok": true,
  "service": "rag-lens",
  "timestamp": "2026-06-27T00:00:00.000Z"
}
```

### `GET /api/warmup`

Returns provider-free warmup metadata for the public GitHub Pages entry. This
route is intentionally cheap: it does not create sessions, touch uploads, query
Supabase, call Perplexity, or call OpenRouter. It is used only to wake the
Render web service before redirecting a visitor to `/workbench`.

`Access-Control-Allow-Origin` is returned only when the request origin matches
`NEXT_PUBLIC_LANDING_ORIGIN`, `NEXT_PUBLIC_SITE_URL`, or
`NEXT_PUBLIC_WARMUP_ALLOWED_ORIGINS`.

Response:

```json
{
  "ok": true,
  "service": "rag-lens",
  "purpose": "render-warmup",
  "timestamp": "2026-06-28T00:00:00.000Z",
  "workbenchPath": "/workbench"
}
```

### `GET /api/corpora`

Lists the public curated example corpora available in the workbench. This route
is provider-free and does not read Supabase, Perplexity, OpenRouter, sessions,
or uploads in V1. The workbench uses it to hydrate its source list while keeping
the bundled manifest as an offline fallback.

Response:

```json
{
  "sources": [
    {
      "slug": "rag-concepts-primer",
      "title": "RAG Concepts Primer",
      "description": "Small first-party explainer corpus",
      "sourceKind": "example",
      "sourceName": "RAG Lens",
      "sourceUrl": "https://github.com/lagarcess/rag-lens",
      "license": "Original first-party demo text written for RAG Lens.",
      "status": "ready",
      "documentCount": 1
    }
  ]
}
```

Session uploads are represented client-side after upload success. A later
session-aware catalog slice can widen this route if the workbench needs a single
server source of truth for both examples and active uploaded documents.

### `POST /api/query`

Runs a RAG trace for either a curated example corpus or the active session's
uploaded documents.

Example corpora can run with deterministic local retrieval or Supabase
`pgvector`, depending on `RAG_RETRIEVAL_BACKEND`. Session uploads always use the
Supabase vector path because uploaded chunks live in the hosted database.

When `CHAT_PROVIDER=openrouter` and `OPENROUTER_API_KEY` are configured, answer
generation uses OpenRouter. Otherwise it falls back to a local extractive answer
so the demo remains usable without chat provider calls.

Request:

```json
{
  "sessionId": null,
  "corpusSlug": "rag-concepts-primer",
  "question": "How does RAG improve trust?",
  "topK": 5,
  "chunkSize": 800,
  "chunkOverlap": 120,
  "embeddingMode": "standard"
}
```

Response:

```json
{
  "queryId": "uuid",
  "answer": "string",
  "citations": [
    {
      "rank": 1,
      "chunkId": "rag-concepts-primer:doc-0:0",
      "fileName": "rag-concepts-primer.md",
      "similarity": 0.75
    }
  ],
  "trace": {
    "settings": {
      "topK": 5,
      "chunkSize": 800,
      "chunkOverlap": 120,
      "embeddingMode": "standard"
    },
    "corpus": {
      "slug": "rag-concepts-primer",
      "title": "RAG Concepts Primer",
      "sourceKind": "example",
      "documentCount": 1
    },
    "extraction": {
      "documents": [
        {
          "documentId": "rag-concepts-primer:doc-0",
          "fileName": "rag-concepts-primer.md",
          "characterCount": 2400
        }
      ]
    },
    "chunking": {
      "totalChunks": 4,
      "chunks": [
        {
          "chunkId": "rag-concepts-primer:doc-0:0",
          "documentId": "rag-concepts-primer:doc-0",
          "fileName": "rag-concepts-primer.md",
          "chunkIndex": 0,
          "charStart": 0,
          "charEnd": 799,
          "content": "string"
        }
      ]
    },
    "retrieval": {
      "method": "deterministic-lexical-overlap",
      "rows": [
        {
          "rank": 1,
          "chunkId": "rag-concepts-primer:doc-0:0",
          "documentId": "rag-concepts-primer:doc-0",
          "fileName": "rag-concepts-primer.md",
          "chunkIndex": 0,
          "charStart": 0,
          "charEnd": 799,
          "content": "string",
          "similarity": 0.75,
          "selected": true,
          "retrievalMode": "lexical",
          "matchedTerms": ["trust"],
          "distance": 0.25,
          "embeddingModel": "pplx-embed-v1-0.6b",
          "embeddingMode": "standard"
        }
      ]
    },
    "prompt": {
      "rendered": "string",
      "contextChunkIds": ["rag-concepts-primer:doc-0:0"]
    },
    "models": {
      "embedding": {
        "provider": "none",
        "model": "local-lexical",
        "queryModel": "local-lexical",
        "documentModel": "local-lexical"
      },
      "answer": {
        "provider": "openrouter",
        "model": "deepseek/deepseek-v4-flash",
        "finishReason": "stop",
        "usage": {
          "promptTokens": 120,
          "completionTokens": 34,
          "totalTokens": 154
        }
      }
    },
    "timingsMs": {
      "total": 1200,
      "retrieval": 220,
      "generation": 980
    },
    "persistence": {
      "mode": "ephemeral",
      "store": "local-example-runner"
    },
    "warnings": []
  }
}
```

For vector-backed uploaded traces, `retrieval.rows[].distance`,
`retrieval.rows[].embeddingModel`, and `retrieval.rows[].embeddingMode` are
populated when available. For local example retrieval, vector-specific row
fields can be omitted.

For uploaded documents, send the anonymous `sessionId` and use
`corpusSlug: "session-uploads"`. The uploaded-document path currently requires
the default indexed vector profile:

```json
{
  "sessionId": "uuid",
  "corpusSlug": "session-uploads",
  "question": "What does my document say about retrieval?",
  "topK": 5,
  "chunkSize": 800,
  "chunkOverlap": 120,
  "embeddingMode": "standard"
}
```

Uploaded-document responses use the same shape, with
`trace.corpus.sourceKind: "upload"`, `trace.retrieval.method:
"supabase-pgvector-cosine"`, and persisted session metadata:

```json
{
  "trace": {
    "persistence": {
      "mode": "session",
      "store": "supabase-trace-history"
    }
  }
}
```

For uploaded traces, `trace.chunking.chunks` contains the session's full indexed
chunk inventory for ready uploaded documents. `trace.retrieval.rows` remains the
ranked subset selected by vector search for the current question.

Example-corpus responses remain ephemeral unless a later slice explicitly saves
seeded example traces.

### `POST /api/sessions`

Creates an anonymous session.

Response:

```json
{
  "sessionId": "uuid",
  "expiresAt": "iso timestamp",
  "hardExpiresAt": "iso timestamp"
}
```

Status: implemented. The session is anonymous, active, and receives both a soft
expiry (`expiresAt`) and abandoned-upload purge eligibility timestamp
(`hardExpiresAt`).

### `DELETE /api/sessions/:sessionId`

Marks an active anonymous session deleted and immediately attempts physical
cleanup for that session's uploaded data.

Successful immediate cleanup response:

```json
{
  "ok": true,
  "sessionId": "uuid",
  "purgeStatus": "completed",
  "purgeRetryScheduled": false,
  "storageObjects": 2,
  "removedStorageObjects": 2,
  "deletedRows": {
    "deleted_sessions": 1
  }
}
```

If the session is marked deleted but Storage or database cleanup cannot be
confirmed, the route returns `202 Accepted` and the scheduled cleanup job will
retry. The browser should clear local upload/session state because the session
has ended.

```json
{
  "ok": true,
  "sessionId": "uuid",
  "purgeStatus": "retry-pending",
  "purgeRetryScheduled": true,
  "warning": "Session deleted. Immediate file cleanup could not be confirmed, so scheduled cleanup will retry during the monthly purge."
}
```

Unknown, non-anonymous, inactive, already purged, or expired sessions return
`404`. Provider or database failures before the session is marked deleted return
`500`.

Response metadata is count-based and does not expose uploaded file contents or
raw Storage paths.

### `POST /api/sessions/:sessionId/heartbeat`

Updates `last_seen_at` for an active, unexpired anonymous session.

Response:

```json
{
  "ok": true,
  "sessionId": "uuid",
  "expiresAt": "iso timestamp",
  "hardExpiresAt": "iso timestamp"
}
```

Unknown, inactive, deleted, or expired sessions return `404`.

This route is rate-limited with the public session lifecycle scope. When
throttled, it returns `429 Too Many Requests` with `Retry-After`,
`X-RateLimit-Limit`, and `X-RateLimit-Remaining` headers.

### `POST /api/uploads`

Accepts a file upload for an active anonymous session.

Request: `multipart/form-data`

- `sessionId`: active anonymous session UUID.
- `file`: PDF, `.txt`, `.md`, or `.markdown` file.

Limits:

- 3 files per session.
- 10 MB total per session.
- PDF, text, and markdown only.
- Browser-reported MIME type is required and must match the file extension.
- Route rejects oversized multipart requests before parsing the body when the
  `Content-Length` header exceeds the configured request cap.

This V1 slice performs synchronous text extraction, default chunking, Perplexity
embedding, and Supabase chunk insertion. A successful upload writes the original
file to Supabase Storage, inserts a `ready` `rag_documents` row, stores
session-scoped `rag_document_chunks`, and returns document metadata. Failed
extraction or indexing is rejected; Storage and database rows are rolled back.

Response:

```json
{
  "documentId": "uuid",
  "sessionId": "uuid",
  "fileName": "notes.md",
  "mimeType": "text/markdown",
  "byteSize": 1234,
  "storagePath": "sessions/session-id/document-id-notes.md",
  "status": "ready",
  "extractedCharacters": 987,
  "expiresAt": "iso timestamp",
  "hardExpiresAt": "iso timestamp"
}
```

Status: implemented for upload, extraction, default-profile chunking,
embedding, and session-scoped vector indexing.

### `GET /api/sessions/:sessionId/traces`

Lists recent persisted traces for an active anonymous session.

Response:

```json
{
  "traces": [
    {
      "queryId": "uuid",
      "question": "What does my document say about retrieval?",
      "answerPreview": "The document says...",
      "sourceTitle": "Uploaded documents",
      "sourceKind": "upload",
      "retrievedCount": 5,
      "createdAt": "iso timestamp"
    }
  ]
}
```

Expired, deleted, or unknown sessions return `404`.

### `GET /api/sessions/:sessionId/traces/:queryId`

Reloads a persisted trace for an active anonymous session.

Response: same shape as `POST /api/query`.

Expired, deleted, unknown, or cross-session traces return `404`.

## Planned

No planned routes are locked beyond the implemented V1 surface above. Future
slices should add contracts here before implementation.
