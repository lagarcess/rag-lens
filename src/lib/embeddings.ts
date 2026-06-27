import { Buffer } from "node:buffer";

export function decodeBase64Int8Embedding(value: string): number[] {
  const bytes = Buffer.from(value, "base64");
  return Array.from(new Int8Array(bytes.buffer, bytes.byteOffset, bytes.length));
}

export function l2Normalize(values: number[]): number[] {
  const magnitude = Math.sqrt(
    values.reduce((total, value) => total + value * value, 0),
  );

  if (magnitude === 0) {
    return values;
  }

  return values.map((value) => value / magnitude);
}

export function toPgVector(values: number[]): string {
  return `[${values.map((value) => Number(value.toFixed(8))).join(",")}]`;
}
