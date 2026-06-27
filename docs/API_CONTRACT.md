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

Runs the current local example trace runner. This V1 implementation is
ephemeral and uses deterministic lexical retrieval over curated example
documents. Supabase persistence, embeddings, and model-backed answers are added
in later slices.

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
    "models": {},
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

### `DELETE /api/sessions/:sessionId`

Deletes a session and queued/uploaded data.

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
