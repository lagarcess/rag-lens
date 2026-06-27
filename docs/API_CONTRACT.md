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

Runs the current example trace runner. This implementation is ephemeral and
uses deterministic lexical retrieval over curated example documents. When
`CHAT_PROVIDER=openrouter` and `OPENROUTER_API_KEY` are configured, answer
generation uses OpenRouter. Otherwise it falls back to a local extractive answer
so the demo remains usable without provider calls.

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

## Planned

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

### `GET /api/corpora`

Lists example corpora and active session documents.

### `POST /api/uploads`

Accepts a file upload for an active anonymous session.

Limits:

- 3 files per session.
- 10 MB total per session.
- PDF, text, and markdown only.

### `POST /api/ingest/:documentId`

Extracts text, chunks it, embeds chunks, and stores vectors.

### Supabase-backed `POST /api/query`

Runs query embedding, vector retrieval, prompt assembly, answer generation, and trace persistence.

Request:

```json
{
  "sessionId": "uuid or null",
  "corpusSlug": "rag-concepts-primer",
  "question": "How does RAG improve trust?",
  "topK": 5,
  "chunkSize": 800,
  "chunkOverlap": 120,
  "embeddingMode": "contextualized"
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
      "chunkId": "uuid",
      "fileName": "rag-primer.md",
      "similarity": 0.84
    }
  ],
  "trace": {
    "retrieval": [],
    "prompt": "string",
    "models": {}
  }
}
```
