import type { RagTraceResponse } from "@/lib/rag/trace";

type SettingKey = "topK" | "chunkSize" | "chunkOverlap" | "embeddingMode";
type ExperimentVerdictStatus = "better" | "worse" | "mixed" | "unchanged";

export interface ExperimentComparison {
  verdict: {
    status: ExperimentVerdictStatus;
    title: string;
    reason: string;
  };
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
  const retrieval: ExperimentComparison["retrieval"] = {
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
  };

  return {
    verdict: buildVerdict(input, retrieval),
    settings: buildSettingDiffs(input),
    retrieval,
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

function buildVerdict(
  input: { baseline: RagTraceResponse; candidate: RagTraceResponse },
  retrieval: ExperimentComparison["retrieval"],
): ExperimentComparison["verdict"] {
  const contextDelta =
    input.candidate.trace.prompt.contextChunkIds.length -
    input.baseline.trace.prompt.contextChunkIds.length;
  const evidenceChanged =
    retrieval.baselineOnlyChunkIds.length > 0 ||
    retrieval.candidateOnlyChunkIds.length > 0;

  if (
    retrieval.topScoreDelta === 0 &&
    retrieval.retrievedDelta === 0 &&
    retrieval.promptCharsDelta === 0 &&
    contextDelta === 0 &&
    !evidenceChanged
  ) {
    return {
      status: "unchanged",
      title: "No practical effect",
      reason:
        "The variant kept the same top score, retrieved chunks, evidence set, and prompt length.",
    };
  }

  if (
    retrieval.candidateRetrievedCount === 0 &&
    retrieval.baselineRetrievedCount > 0
  ) {
    return {
      status: "worse",
      title: "Retrieval weakened",
      reason:
        "The variant retrieved no chunks, so the answer has no grounded context.",
    };
  }

  if (retrieval.topScoreDelta > 0) {
    const evidenceClause = evidenceChanged
      ? `and ${describeEvidenceChange(retrieval)}.`
      : "without changing the evidence set.";

    return {
      status: "better",
      title: "Retrieval improved",
      reason: `The variant found a stronger top match (${formatSignedDelta(
        retrieval.topScoreDelta,
      )} similarity) ${evidenceClause}`,
    };
  }

  if (retrieval.topScoreDelta < 0) {
    return {
      status: "worse",
      title: "Retrieval weakened",
      reason: `The variant lowered the top match (${formatSignedDelta(
        retrieval.topScoreDelta,
      )} similarity), so the answer may be less grounded.`,
    };
  }

  if (evidenceChanged) {
    return {
      status: "mixed",
      title: "Evidence changed",
      reason: `The top score stayed the same, but the variant ${joinClauses(
        [
          describeEvidenceChange(retrieval),
          describePromptDelta(retrieval.promptCharsDelta),
          describeContextDelta(contextDelta),
        ],
      )}.`,
    };
  }

  if (retrieval.promptCharsDelta !== 0 || contextDelta !== 0) {
    return {
      status: "mixed",
      title: "Prompt changed",
      reason: `Retrieval matched the baseline, but the variant ${joinClauses([
        describePromptDelta(retrieval.promptCharsDelta),
        describeContextDelta(contextDelta),
      ])}.`,
    };
  }

  return {
    status: "mixed",
    title: "Retrieval count changed",
    reason: `The top score stayed the same, but the variant ${describeRetrievedDelta(
      retrieval.retrievedDelta,
    )}.`,
  };
}

function roundDelta(value: number) {
  return Number(value.toFixed(4));
}

function formatSignedDelta(value: number) {
  return `${value > 0 ? "+" : "-"}${Math.abs(value)}`;
}

function describeEvidenceChange(retrieval: ExperimentComparison["retrieval"]) {
  const candidateOnlyCount = retrieval.candidateOnlyChunkIds.length;
  const baselineOnlyCount = retrieval.baselineOnlyChunkIds.length;

  if (candidateOnlyCount > 0 && baselineOnlyCount > 0) {
    return `swapped ${candidateOnlyCount} ${pluralize(
      "chunk",
      candidateOnlyCount,
    )} in and ${baselineOnlyCount} ${pluralize(
      "chunk",
      baselineOnlyCount,
    )} out`;
  }

  if (candidateOnlyCount > 0) {
    return `added ${candidateOnlyCount} ${pluralize(
      "new chunk",
      candidateOnlyCount,
    )}`;
  }

  return `dropped ${baselineOnlyCount} ${pluralize(
    "chunk",
    baselineOnlyCount,
  )}`;
}

function describePromptDelta(delta: number) {
  if (delta > 0) {
    return `expanded the prompt by ${delta} ${pluralize("character", delta)}`;
  }

  if (delta < 0) {
    const absoluteDelta = Math.abs(delta);

    return `contracted the prompt by ${absoluteDelta} ${pluralize(
      "character",
      absoluteDelta,
    )}`;
  }

  return null;
}

function describeContextDelta(delta: number) {
  if (delta > 0) {
    return `sent ${delta} more ${pluralize("chunk", delta)} to the prompt`;
  }

  if (delta < 0) {
    const absoluteDelta = Math.abs(delta);

    return `sent ${absoluteDelta} fewer ${pluralize(
      "chunk",
      absoluteDelta,
    )} to the prompt`;
  }

  return null;
}

function describeRetrievedDelta(delta: number) {
  if (delta > 0) {
    return `retrieved ${delta} more ${pluralize("chunk", delta)}`;
  }

  const absoluteDelta = Math.abs(delta);

  return `retrieved ${absoluteDelta} fewer ${pluralize(
    "chunk",
    absoluteDelta,
  )}`;
}

function joinClauses(clauses: Array<string | null>) {
  const activeClauses = clauses.filter((clause) => clause !== null);

  if (activeClauses.length <= 1) {
    return activeClauses[0] ?? "changed the trace";
  }

  if (activeClauses.length === 2) {
    return `${activeClauses[0]} and ${activeClauses[1]}`;
  }

  return `${activeClauses.slice(0, -1).join(", ")}, and ${
    activeClauses[activeClauses.length - 1]
  }`;
}

function pluralize(label: string, count: number) {
  return count === 1 ? label : `${label}s`;
}
