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
    "settings": {},
    "corpus": {},
    "extraction": {},
    "chunking": {},
    "retrieval": {
      "method": "deterministic-lexical-overlap",
      "rows": []
    },
    "prompt": {},
    "models": {
      "embedding": {
        "provider": "none",
        "model": "local-lexical"
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
    "timingsMs": {},
    "persistence": {
      "mode": "ephemeral",
      "store": "local-example-runner"
    },
    "warnings": []
  }
}
```

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
expiry (`expiresAt`) and physical purge deadline (`hardExpiresAt`).

### `DELETE /api/sessions/:sessionId`

Deletes a session and queued/uploaded data.

Status: implemented as a soft delete marker. Cleanup physically removes expired
or deleted session data.

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

### `POST /api/uploads`

Accepts a file upload for an active anonymous session.

Request: `multipart/form-data`

- `sessionId`: active anonymous session UUID.
- `file`: PDF, `.txt`, `.md`, or `.markdown` file.

Limits:

- 3 files per session.
- 10 MB total per session.
- PDF, text, and markdown only.
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

### `GET /api/corpora`

Lists example corpora and active session documents when the workbench stops
using its current static source seed.
