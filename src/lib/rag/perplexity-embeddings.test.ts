import { Buffer } from "node:buffer";
import { describe, expect, test } from "bun:test";

import {
  embedDocumentChunksWithPerplexity,
  embedTextsWithPerplexity,
} from "./perplexity-embeddings";

describe("embedTextsWithPerplexity", () => {
  test("requests base64 int8 embeddings and normalizes decoded vectors", async () => {
    const encoded = Buffer.from(Int8Array.from([3, 4])).toString("base64");
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });

      return new Response(
        JSON.stringify({
          data: [{ embedding: encoded }],
          model: "pplx-embed-v1-0.6b",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };

    const result = await embedTextsWithPerplexity(
      {
        apiKey: "pplx-test-key",
        model: "pplx-embed-v1-0.6b",
        input: ["RAG improves answer trust."],
        dimensions: 2,
      },
      fetchFn,
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.perplexity.ai/v1/embeddings");
    expect(calls[0].init.headers).toMatchObject({
      Authorization: "Bearer pplx-test-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({
      model: "pplx-embed-v1-0.6b",
      input: ["RAG improves answer trust."],
      dimensions: 2,
      encoding_format: "base64_int8",
    });
    expect(result).toEqual([[0.6, 0.8]]);
  });

  test("requests contextualized embeddings with nested document chunks", async () => {
    const encoded = Buffer.from(Int8Array.from([5, 12])).toString("base64");
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });

      return new Response(
        JSON.stringify({
          data: [{ index: 0, data: [{ index: 0, embedding: encoded }] }],
          model: "pplx-embed-context-v1-0.6b",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };

    const result = await embedDocumentChunksWithPerplexity(
      {
        apiKey: "pplx-test-key",
        model: "pplx-embed-context-v1-0.6b",
        documents: [["chunk one"]],
        dimensions: 2,
      },
      fetchFn,
    );

    expect(calls[0].url).toBe(
      "https://api.perplexity.ai/v1/contextualizedembeddings",
    );
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({
      model: "pplx-embed-context-v1-0.6b",
      input: [["chunk one"]],
      dimensions: 2,
      encoding_format: "base64_int8",
    });
    expect(result).toEqual([[[5 / 13, 12 / 13]]]);
  });
});
