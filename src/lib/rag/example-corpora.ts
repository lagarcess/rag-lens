import { readFile } from "node:fs/promises";
import path from "node:path";

import { getExampleCorpusManifest } from "./example-corpus-manifest";

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

export async function loadExampleCorpus(slug: string): Promise<ExampleCorpus> {
  const manifest = getExampleCorpusManifest(slug);

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
