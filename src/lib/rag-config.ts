export const RAG_LIMITS = {
  maxAnonymousFiles: 3,
  maxAnonymousBytes: 10 * 1024 * 1024,
  softSessionTtlHours: 2,
  hardSessionTtlHours: 23.5,
  maxTopK: 12,
  defaultTopK: 5,
  defaultChunkSize: 800,
  defaultChunkOverlap: 120,
} as const;

export const RAG_MODELS = {
  standardEmbedding: "pplx-embed-v1-0.6b",
  contextualEmbedding: "pplx-embed-context-v1-0.6b",
  embeddingDimensions: 1024,
} as const;

export const STORAGE = {
  uploadBucket: "rag-uploads",
} as const;
