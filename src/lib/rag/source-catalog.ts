import { listExampleCorpusManifests } from "@/lib/rag/example-corpus-manifest";

export interface RagSourceCatalogItem {
  slug: string;
  title: string;
  description: string;
  sourceKind: "example";
  sourceName: string;
  sourceUrl: string;
  license: string;
  status: "ready";
  documentCount: number;
}

export interface RagSourceCatalogResponse {
  sources: RagSourceCatalogItem[];
}

export function listExampleSourceCatalogItems(): RagSourceCatalogItem[] {
  return listExampleCorpusManifests().map((corpus) => ({
    slug: corpus.slug,
    title: corpus.title,
    description: corpus.description,
    sourceKind: corpus.sourceKind,
    sourceName: corpus.sourceName,
    sourceUrl: corpus.sourceUrl,
    license: corpus.license,
    status: corpus.status,
    documentCount: corpus.documentCount,
  }));
}
