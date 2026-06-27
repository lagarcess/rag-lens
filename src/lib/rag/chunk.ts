import type { RagChunk } from "./trace";

interface ChunkTextInput {
  documentId: string;
  fileName: string;
  content: string;
}

interface ChunkTextOptions {
  chunkSize: number;
  chunkOverlap: number;
}

export function chunkText(
  input: ChunkTextInput,
  options: ChunkTextOptions,
): RagChunk[] {
  const chunkSize = Math.max(1, Math.floor(options.chunkSize));
  const chunkOverlap = Math.max(
    0,
    Math.min(Math.floor(options.chunkOverlap), chunkSize - 1),
  );

  const chunks: RagChunk[] = [];
  let charStart = 0;

  while (charStart < input.content.length) {
    const charEnd = Math.min(input.content.length, charStart + chunkSize);
    const chunkIndex = chunks.length;

    chunks.push({
      chunkId: `${input.documentId}:${chunkIndex}`,
      documentId: input.documentId,
      fileName: input.fileName,
      chunkIndex,
      charStart,
      charEnd,
      content: input.content.slice(charStart, charEnd),
    });

    if (charEnd === input.content.length) {
      break;
    }

    charStart = charEnd - chunkOverlap;
  }

  return chunks;
}
