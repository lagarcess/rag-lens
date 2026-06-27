import { l2Normalize, decodeBase64Int8Embedding } from "@/lib/embeddings";
import { RAG_MODELS } from "@/lib/rag-config";

interface PerplexityEmbeddingInput {
  apiKey: string;
  model: string;
  input: string[];
  dimensions?: number;
}

interface PerplexityContextualEmbeddingInput {
  apiKey: string;
  model: string;
  documents: string[][];
  dimensions?: number;
}

type FetchFn = (
  url: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export async function embedTextsWithPerplexity(
  input: PerplexityEmbeddingInput,
  fetchFn: FetchFn = fetch,
): Promise<number[][]> {
  const dimensions = input.dimensions ?? RAG_MODELS.embeddingDimensions;
  const response = await fetchFn("https://api.perplexity.ai/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      input: input.input,
      dimensions,
      encoding_format: "base64_int8",
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity embeddings request failed: ${response.status}`);
  }

  const json = (await response.json()) as PerplexityEmbeddingResponse;

  return json.data.map((item) => decodeAndNormalize(item.embedding, dimensions));
}

export async function embedDocumentChunksWithPerplexity(
  input: PerplexityContextualEmbeddingInput,
  fetchFn: FetchFn = fetch,
): Promise<number[][][]> {
  const dimensions = input.dimensions ?? RAG_MODELS.embeddingDimensions;
  const response = await fetchFn(
    "https://api.perplexity.ai/v1/contextualizedembeddings",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        input: input.documents,
        dimensions,
        encoding_format: "base64_int8",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Perplexity contextual embeddings request failed: ${response.status}`,
    );
  }

  const json = (await response.json()) as PerplexityContextualEmbeddingResponse;

  return json.data.map((document) =>
    document.data.map((item) => decodeAndNormalize(item.embedding, dimensions)),
  );
}

interface PerplexityEmbeddingResponse {
  data: Array<{
    embedding: string;
  }>;
}

interface PerplexityContextualEmbeddingResponse {
  data: Array<{
    data: Array<{
      embedding: string;
    }>;
  }>;
}

function decodeAndNormalize(value: string, dimensions: number) {
  const decoded = decodeBase64Int8Embedding(value);

  if (decoded.length !== dimensions) {
    throw new Error(
      `Embedding dimension mismatch: expected ${dimensions}, received ${decoded.length}`,
    );
  }

  const normalized = l2Normalize(decoded);

  if (normalized.every((component) => component === 0)) {
    throw new Error("Embedding vector must not be all zeros");
  }

  return normalized;
}
