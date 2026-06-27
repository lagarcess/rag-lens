import { readFile } from "node:fs/promises";
import path from "node:path";

export interface ExampleDocument {
  documentId: string;
  fileName: string;
  content: string;
}

export interface ExampleCorpus {
  slug: string;
  title: string;
  documents: ExampleDocument[];
}

const EXAMPLE_CORPORA = {
  "rag-concepts-primer": {
    slug: "rag-concepts-primer",
    title: "RAG Concepts Primer",
    documents: [
      {
      documentId: "rag-concepts-primer:doc-0",
      fileName: "rag-concepts-primer.md",
      },
    ],
  },
} as const;

export async function loadExampleCorpus(slug: string): Promise<ExampleCorpus> {
  const manifest = EXAMPLE_CORPORA[slug as keyof typeof EXAMPLE_CORPORA];

  if (!manifest) {
    throw new Error(`Unknown example corpus: ${slug}`);
  }

  const documents = await Promise.all(
    manifest.documents.map(async (document) => ({
      documentId: document.documentId,
      fileName: document.fileName,
      content: await readFile(
        path.join(process.cwd(), "src", "data", "examples", document.fileName),
        {
          encoding: "utf8",
        },
      ),
    })),
  );

  return {
    slug: manifest.slug,
    title: manifest.title,
    documents,
  };
}
