import type { RagTraceResponse } from "@/lib/rag/trace";

type SettingKey = "topK" | "chunkSize" | "chunkOverlap" | "embeddingMode";

export interface ExperimentComparison {
  settings: Array<{
    key: SettingKey;
    label: string;
    baseline: string;
    candidate: string;
    changed: boolean;
  }>;
  retrieval: {
    baselineTopScore: number;
    candidateTopScore: number;
    baselineRetrievedCount: number;
    candidateRetrievedCount: number;
    baselinePromptChars: number;
    candidatePromptChars: number;
    topScoreDelta: number;
    retrievedDelta: number;
    promptCharsDelta: number;
    sharedChunkIds: string[];
    baselineOnlyChunkIds: string[];
    candidateOnlyChunkIds: string[];
  };
  notes: string[];
}

export function buildExperimentComparison(input: {
  baseline: RagTraceResponse;
  candidate: RagTraceResponse;
}): ExperimentComparison {
  const baselineRows = input.baseline.trace.retrieval.rows;
  const candidateRows = input.candidate.trace.retrieval.rows;
  const baselineIds = new Set(baselineRows.map((row) => row.chunkId));
  const candidateIds = new Set(candidateRows.map((row) => row.chunkId));
  const baselineTopScore = baselineRows[0]?.similarity ?? 0;
  const candidateTopScore = candidateRows[0]?.similarity ?? 0;

  return {
    settings: buildSettingDiffs(input),
    retrieval: {
      baselineTopScore,
      candidateTopScore,
      baselineRetrievedCount: baselineRows.length,
      candidateRetrievedCount: candidateRows.length,
      baselinePromptChars: input.baseline.trace.prompt.rendered.length,
      candidatePromptChars: input.candidate.trace.prompt.rendered.length,
      topScoreDelta: roundDelta(candidateTopScore - baselineTopScore),
      retrievedDelta: candidateRows.length - baselineRows.length,
      promptCharsDelta:
        input.candidate.trace.prompt.rendered.length -
        input.baseline.trace.prompt.rendered.length,
      sharedChunkIds: candidateRows
        .map((row) => row.chunkId)
        .filter((chunkId) => baselineIds.has(chunkId)),
      baselineOnlyChunkIds: baselineRows
        .map((row) => row.chunkId)
        .filter((chunkId) => !candidateIds.has(chunkId)),
      candidateOnlyChunkIds: candidateRows
        .map((row) => row.chunkId)
        .filter((chunkId) => !baselineIds.has(chunkId)),
    },
    notes: buildFailureModeNotes(input.candidate),
  };
}

function buildSettingDiffs(input: {
  baseline: RagTraceResponse;
  candidate: RagTraceResponse;
}): ExperimentComparison["settings"] {
  const baseline = input.baseline.trace.settings;
  const candidate = input.candidate.trace.settings;

  return [
    {
      key: "topK",
      label: "top_k",
      baseline: String(baseline.topK),
      candidate: String(candidate.topK),
      changed: baseline.topK !== candidate.topK,
    },
    {
      key: "chunkSize",
      label: "chunk_size",
      baseline: String(baseline.chunkSize),
      candidate: String(candidate.chunkSize),
      changed: baseline.chunkSize !== candidate.chunkSize,
    },
    {
      key: "chunkOverlap",
      label: "overlap",
      baseline: String(baseline.chunkOverlap),
      candidate: String(candidate.chunkOverlap),
      changed: baseline.chunkOverlap !== candidate.chunkOverlap,
    },
    {
      key: "embeddingMode",
      label: "embedding",
      baseline: baseline.embeddingMode,
      candidate: candidate.embeddingMode,
      changed: baseline.embeddingMode !== candidate.embeddingMode,
    },
  ];
}

function buildFailureModeNotes(candidate: RagTraceResponse) {
  const notes: string[] = [];
  const rows = candidate.trace.retrieval.rows;
  const topScore = rows[0]?.similarity ?? 0;

  if (rows.length === 0) {
    notes.push(
      "Candidate retrieved no chunks, so the answer has no grounded context.",
    );
  }

  if (rows.length > 0 && candidate.trace.prompt.contextChunkIds.length === 0) {
    notes.push("Candidate retrieved chunks but none reached the prompt context.");
  }

  if (topScore < 0.25) {
    notes.push(
      "Candidate top similarity is weak; try a smaller chunk size or broader top_k.",
    );
  }

  if (candidate.trace.settings.chunkSize >= 1200) {
    notes.push(
      "Candidate chunk size is large enough to bury precise answers and inflate the prompt.",
    );
  }

  return notes;
}

function roundDelta(value: number) {
  return Number(value.toFixed(4));
}
