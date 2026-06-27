export interface ExampleCorpusDocumentManifest {
  documentId: string;
  fileName: string;
}

export interface ExampleCorpusManifest {
  slug: string;
  title: string;
  description: string;
  sourceKind: "example";
  sourceName: string;
  sourceUrl: string;
  license: string;
  status: "ready";
  documentCount: number;
  documents: ExampleCorpusDocumentManifest[];
}

type InternalExampleCorpusManifest = Omit<
  ExampleCorpusManifest,
  "documentCount"
>;

const EXAMPLE_CORPORA = [
  {
    slug: "rag-concepts-primer",
    title: "RAG Concepts Primer",
    description: "Small first-party explainer corpus",
    sourceKind: "example",
    sourceName: "RAG Lens",
    sourceUrl: "https://github.com/lagarcess/rag-lens",
    license: "Original first-party demo text written for RAG Lens.",
    status: "ready",
    documents: [
      {
        documentId: "rag-concepts-primer:doc-0",
        fileName: "rag-concepts-primer.md",
      },
    ],
  },
  {
    slug: "claim-check-clinic",
    title: "Claim Check Clinic",
    description: "Evidence retrieval and claim-support demo",
    sourceKind: "example",
    sourceName: "RAG Lens",
    sourceUrl: "https://github.com/lagarcess/rag-lens",
    license:
      "Original first-party demo text written for RAG Lens; not derived from SciFact, BEIR, or any benchmark dataset.",
    status: "ready",
    documents: [
      {
        documentId: "claim-check-clinic:doc-0",
        fileName: "claim-check-clinic.md",
      },
    ],
  },
  {
    slug: "two-hop-systems-brief",
    title: "Two-Hop Systems Brief",
    description: "Multi-hop retrieval debugging demo",
    sourceKind: "example",
    sourceName: "RAG Lens",
    sourceUrl: "https://github.com/lagarcess/rag-lens",
    license:
      "Original first-party demo text written for RAG Lens; not derived from HotpotQA or any benchmark dataset.",
    status: "ready",
    documents: [
      {
        documentId: "two-hop-systems-brief:doc-0",
        fileName: "two-hop-systems-brief.md",
      },
    ],
  },
] as const satisfies readonly InternalExampleCorpusManifest[];

export function listExampleCorpusManifests(): ExampleCorpusManifest[] {
  return EXAMPLE_CORPORA.map((corpus) => ({
    ...corpus,
    documentCount: corpus.documents.length,
    documents: corpus.documents.map((document) => ({ ...document })),
  }));
}

export function getExampleCorpusSlugs() {
  return EXAMPLE_CORPORA.map((corpus) => corpus.slug);
}

export function getExampleCorpusManifest(slug: string) {
  return listExampleCorpusManifests().find((corpus) => corpus.slug === slug);
}
