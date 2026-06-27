import { Buffer } from "node:buffer";

import { RAG_LIMITS } from "@/lib/rag-config";

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "application/pdf",
  "text/markdown",
  "text/plain",
  "text/x-markdown",
]);

type UploadDocumentStatus = "pending" | "processing" | "ready" | "failed";

export class UploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

export interface UploadRepository {
  findActiveSession(input: {
    sessionId: string;
    now: string;
  }): Promise<UploadSession | null>;
  createUploadDocument(row: UploadDocumentInsert): Promise<{ id: string }>;
}

export interface UploadStorage {
  upload(input: {
    bucket: string;
    path: string;
    bytes: Uint8Array;
    contentType: string;
  }): Promise<void>;
  remove(input: { bucket: string; paths: string[] }): Promise<void>;
}

export interface UploadSession {
  id: string;
  expiresAt: string;
  hardExpiresAt: string;
}

export interface UploadDocumentInsert {
  id: string;
  session_id: string;
  corpus_slug: null;
  source_kind: "upload";
  file_name: string;
  mime_type: string;
  byte_size: number;
  storage_path: string;
  status: UploadDocumentStatus;
  extraction_error: string | null;
  extracted_text: string | null;
  expires_at: string;
  hard_expires_at: string;
}

export interface UploadedDocumentResponse {
  documentId: string;
  sessionId: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  storagePath: string;
  status: UploadDocumentStatus;
  extractedCharacters: number;
  expiresAt: string;
  hardExpiresAt: string;
}

export function validateUploadFile(input: {
  fileName: string;
  mimeType: string;
  byteSize: number;
}) {
  const mimeType = normalizeUploadMimeType(input.mimeType, input.fileName);

  if (!ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)) {
    throw new UploadError("Upload a PDF, text, and markdown file.", 400);
  }

  const extensionType = inferMimeTypeFromExtension(input.fileName);

  if (!extensionType || extensionType !== mimeType) {
    throw new UploadError("File extension does not match its content type.", 400);
  }

  if (input.byteSize <= 0) {
    throw new UploadError("Upload file must not be empty.", 400);
  }

  if (input.byteSize > RAG_LIMITS.maxAnonymousBytes) {
    throw new UploadError("Upload file must be 10 MB or smaller.", 400);
  }

  return {
    fileName: input.fileName,
    mimeType,
    byteSize: input.byteSize,
  };
}

export async function extractUploadText(input: {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  pdfExtractor?: (bytes: Uint8Array) => Promise<string>;
}) {
  if (input.mimeType === "application/pdf") {
    if (!hasPdfHeader(input.bytes)) {
      throw new UploadError("Upload a valid PDF file.", 400);
    }

    const extracted = await (input.pdfExtractor ?? extractPdfText)(input.bytes);
    return normalizeExtractedText(extracted);
  }

  try {
    return normalizeExtractedText(
      new TextDecoder("utf-8", { fatal: true }).decode(input.bytes),
    );
  } catch (error) {
    if (error instanceof UploadError) {
      throw error;
    }

    throw new UploadError("Upload text must be valid UTF-8.", 400);
  }
}

export function buildUploadStoragePath(input: {
  sessionId: string;
  documentId: string;
  fileName: string;
}) {
  return `sessions/${input.sessionId}/${input.documentId}-${sanitizeFileName(
    input.fileName,
  )}`;
}

export async function uploadDocumentFromFormData(input: {
  formData: FormData;
  repository: UploadRepository;
  storage: UploadStorage;
  bucket: string;
  now?: Date;
  idGenerator?: () => string;
  pdfExtractor?: (bytes: Uint8Array) => Promise<string>;
}): Promise<UploadedDocumentResponse> {
  const now = (input.now ?? new Date()).toISOString();
  const sessionId = readSessionId(input.formData);
  const file = readUploadFile(input.formData);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const validated = validateUploadFile({
    fileName: file.name,
    mimeType: file.type,
    byteSize: bytes.byteLength,
  });
  const session = await input.repository.findActiveSession({ sessionId, now });

  if (!session) {
    throw new UploadError("Session not found or expired.", 404);
  }

  const documentId = (input.idGenerator ?? (() => crypto.randomUUID()))();
  const storagePath = buildUploadStoragePath({
    sessionId,
    documentId,
    fileName: validated.fileName,
  });
  const extractedText = await extractUploadText({
    fileName: validated.fileName,
    mimeType: validated.mimeType,
    bytes,
    pdfExtractor: input.pdfExtractor,
  });

  await input.storage.upload({
    bucket: input.bucket,
    path: storagePath,
    bytes,
    contentType: validated.mimeType,
  });

  try {
    await input.repository.createUploadDocument({
      id: documentId,
      session_id: session.id,
      corpus_slug: null,
      source_kind: "upload",
      file_name: validated.fileName,
      mime_type: validated.mimeType,
      byte_size: validated.byteSize,
      storage_path: storagePath,
      status: "ready",
      extraction_error: null,
      extracted_text: extractedText,
      expires_at: session.expiresAt,
      hard_expires_at: session.hardExpiresAt,
    });
  } catch (error) {
    await input.storage.remove({
      bucket: input.bucket,
      paths: [storagePath],
    });
    throw error;
  }

  return {
    documentId,
    sessionId: session.id,
    fileName: validated.fileName,
    mimeType: validated.mimeType,
    byteSize: validated.byteSize,
    storagePath,
    status: "ready",
    extractedCharacters: extractedText.length,
    expiresAt: session.expiresAt,
    hardExpiresAt: session.hardExpiresAt,
  };
}

function readSessionId(formData: FormData) {
  const sessionId = formData.get("sessionId");

  if (typeof sessionId !== "string" || !isUuid(sessionId)) {
    throw new UploadError("Upload requires an active session.", 400);
  }

  return sessionId;
}

function readUploadFile(formData: FormData) {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new UploadError("Upload requires a file.", 400);
  }

  return file;
}

function normalizeUploadMimeType(mimeType: string, fileName: string) {
  if (mimeType) {
    return mimeType.toLowerCase();
  }

  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (lowerName.endsWith(".md") || lowerName.endsWith(".markdown")) {
    return "text/markdown";
  }

  if (lowerName.endsWith(".txt")) {
    return "text/plain";
  }

  return "application/octet-stream";
}

function inferMimeTypeFromExtension(fileName: string) {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (lowerName.endsWith(".md") || lowerName.endsWith(".markdown")) {
    return "text/markdown";
  }

  if (lowerName.endsWith(".txt")) {
    return "text/plain";
  }

  return null;
}

function hasPdfHeader(bytes: Uint8Array) {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

function normalizeExtractedText(value: string) {
  const text = value.replace(/\u0000/g, "").trim();

  if (!text) {
    throw new UploadError("No readable text was extracted from this file.", 400);
  }

  return text;
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+\./g, ".")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "upload";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function extractPdfText(bytes: Uint8Array) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: Buffer.from(bytes) });

  try {
    const parsed = await parser.getText();
    return parsed.text;
  } finally {
    await parser.destroy();
  }
}
