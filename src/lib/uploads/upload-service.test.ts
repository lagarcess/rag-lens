import { describe, expect, test } from "bun:test";

import {
  buildUploadStoragePath,
  extractUploadText,
  uploadDocumentFromFormData,
  validateUploadFile,
} from "./upload-service";

const activeSession = {
  id: "11111111-1111-4111-8111-111111111111",
  expiresAt: "2026-06-27T12:00:00.000Z",
  hardExpiresAt: "2026-06-28T10:00:00.000Z",
};

describe("validateUploadFile", () => {
  test("accepts text, markdown, and pdf uploads", () => {
    expect(
      validateUploadFile({
        fileName: "notes.txt",
        mimeType: "text/plain",
        byteSize: 42,
      }),
    ).toMatchObject({ mimeType: "text/plain" });
    expect(
      validateUploadFile({
        fileName: "guide.md",
        mimeType: "text/markdown",
        byteSize: 42,
      }),
    ).toMatchObject({ mimeType: "text/markdown" });
    expect(
      validateUploadFile({
        fileName: "paper.pdf",
        mimeType: "application/pdf",
        byteSize: 42,
      }),
    ).toMatchObject({ mimeType: "application/pdf" });
  });

  test("rejects unsupported or oversized files", () => {
    expect(() =>
      validateUploadFile({
        fileName: "contacts.csv",
        mimeType: "text/csv",
        byteSize: 42,
      }),
    ).toThrow("PDF, text, and markdown");
    expect(() =>
      validateUploadFile({
        fileName: "huge.md",
        mimeType: "text/markdown",
        byteSize: 10 * 1024 * 1024 + 1,
      }),
    ).toThrow("10 MB");
    expect(() =>
      validateUploadFile({
        fileName: "notes.pdf",
        mimeType: "text/plain",
        byteSize: 42,
      }),
    ).toThrow("File extension does not match");
  });
});

describe("extractUploadText", () => {
  test("extracts utf-8 text and markdown content", async () => {
    const bytes = new TextEncoder().encode("# RAG\n\nGrounded answers.");

    await expect(
      extractUploadText({
        fileName: "notes.md",
        mimeType: "text/markdown",
        bytes,
      }),
    ).resolves.toBe("# RAG\n\nGrounded answers.");
  });

  test("uses the PDF extractor for pdf uploads", async () => {
    const bytes = new Uint8Array([37, 80, 68, 70, 45]);

    await expect(
      extractUploadText({
        fileName: "paper.pdf",
        mimeType: "application/pdf",
        bytes,
        pdfExtractor: async (pdfBytes) => `pdf bytes: ${pdfBytes.length}`,
      }),
    ).resolves.toBe("pdf bytes: 5");
  });

  test("rejects PDF files without a PDF header and invalid UTF-8 text", async () => {
    await expect(
      extractUploadText({
        fileName: "paper.pdf",
        mimeType: "application/pdf",
        bytes: new TextEncoder().encode("not a pdf"),
        pdfExtractor: async () => "never called",
      }),
    ).rejects.toThrow("valid PDF");

    await expect(
      extractUploadText({
        fileName: "notes.txt",
        mimeType: "text/plain",
        bytes: new Uint8Array([0xff]),
      }),
    ).rejects.toThrow("valid UTF-8");
  });
});

describe("buildUploadStoragePath", () => {
  test("stores files under the session folder with a sanitized filename", () => {
    expect(
      buildUploadStoragePath({
        sessionId: activeSession.id,
        documentId: "22222222-2222-4222-8222-222222222222",
        fileName: "My Notes!.md",
      }),
    ).toBe(
      "sessions/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222-my-notes.md",
    );
  });
});

describe("uploadDocumentFromFormData", () => {
  test("stores an active-session upload and creates a ready document row with retention fields", async () => {
    const repository = new FakeUploadRepository({
      session: activeSession,
      existingUploads: [],
    });
    const storage = new FakeUploadStorage();
    const ingestedDocuments: Array<Record<string, unknown>> = [];
    const formData = new FormData();
    formData.set("sessionId", activeSession.id);
    formData.set(
      "file",
      new File(["RAG improves answer trust."], "notes.md", {
        type: "text/markdown",
      }),
    );

    const result = await uploadDocumentFromFormData({
      formData,
      repository,
      storage,
      bucket: "rag-uploads",
      now: new Date("2026-06-27T10:30:00.000Z"),
      idGenerator: () => "33333333-3333-4333-8333-333333333333",
      ingestor: async (document) => {
        ingestedDocuments.push(document);
      },
    });

    expect(storage.uploads[0]).toMatchObject({
      bucket: "rag-uploads",
      contentType: "text/markdown",
      path: "sessions/11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333-notes.md",
    });
    expect(repository.insertedRows[0]).toMatchObject({
      id: "33333333-3333-4333-8333-333333333333",
      session_id: activeSession.id,
      corpus_slug: null,
      source_kind: "upload",
      file_name: "notes.md",
      mime_type: "text/markdown",
      byte_size: 26,
      storage_path:
        "sessions/11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333-notes.md",
      status: "ready",
      extracted_text: "RAG improves answer trust.",
      expires_at: activeSession.expiresAt,
      hard_expires_at: activeSession.hardExpiresAt,
    });
    expect(ingestedDocuments).toEqual([
      {
        documentId: "33333333-3333-4333-8333-333333333333",
        sessionId: activeSession.id,
        fileName: "notes.md",
        extractedText: "RAG improves answer trust.",
        expiresAt: activeSession.expiresAt,
        hardExpiresAt: activeSession.hardExpiresAt,
      },
    ]);
    expect(result).toMatchObject({
      documentId: "33333333-3333-4333-8333-333333333333",
      sessionId: activeSession.id,
      fileName: "notes.md",
      status: "ready",
      extractedCharacters: 26,
    });
  });

  test("uses the default crypto UUID generator safely", async () => {
    const repository = new FakeUploadRepository({
      session: activeSession,
    });
    const storage = new FakeUploadStorage();

    const result = await uploadDocumentFromFormData({
      formData: makeUploadFormData(activeSession.id),
      repository,
      storage,
      bucket: "rag-uploads",
      now: new Date("2026-06-27T10:30:00.000Z"),
    });

    expect(result.documentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(repository.insertedRows[0].id).toBe(result.documentId);
  });

  test("rejects expired sessions before storage writes", async () => {
    const expiredRepository = new FakeUploadRepository({ session: null });
    const storage = new FakeUploadStorage();

    await expect(
      uploadDocumentFromFormData({
        formData: makeUploadFormData(activeSession.id),
        repository: expiredRepository,
        storage,
        bucket: "rag-uploads",
        now: new Date("2026-06-27T10:30:00.000Z"),
        idGenerator: () => "33333333-3333-4333-8333-333333333333",
      }),
    ).rejects.toMatchObject({ status: 404 });

    expect(storage.uploads).toHaveLength(0);
  });

  test("rolls back storage when atomic document registration rejects upload limits", async () => {
    const repository = new FakeUploadRepository({
      session: activeSession,
      createError: new Error("Anonymous sessions are limited to 3 files."),
    });
    const storage = new FakeUploadStorage();

    await expect(
      uploadDocumentFromFormData({
        formData: makeUploadFormData(activeSession.id),
        repository,
        storage,
        bucket: "rag-uploads",
        now: new Date("2026-06-27T10:30:00.000Z"),
        idGenerator: () => "33333333-3333-4333-8333-333333333333",
      }),
    ).rejects.toThrow("Anonymous sessions are limited to 3 files.");

    expect(storage.uploads).toHaveLength(1);
    expect(storage.removals).toEqual([
      {
        bucket: "rag-uploads",
        paths: [
          "sessions/11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333-notes.md",
        ],
      },
    ]);
  });

  test("rolls back storage and document rows when upload ingestion fails", async () => {
    const repository = new FakeUploadRepository({
      session: activeSession,
    });
    const storage = new FakeUploadStorage();

    await expect(
      uploadDocumentFromFormData({
        formData: makeUploadFormData(activeSession.id),
        repository,
        storage,
        bucket: "rag-uploads",
        now: new Date("2026-06-27T10:30:00.000Z"),
        idGenerator: () => "33333333-3333-4333-8333-333333333333",
        ingestor: async () => {
          throw new Error("Embedding provider unavailable");
        },
      }),
    ).rejects.toThrow("Embedding provider unavailable");

    expect(storage.removals).toEqual([
      {
        bucket: "rag-uploads",
        paths: [
          "sessions/11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333-notes.md",
        ],
      },
    ]);
    expect(repository.deletedDocumentIds).toEqual([
      "33333333-3333-4333-8333-333333333333",
    ]);
  });
});

function makeUploadFormData(sessionId: string) {
  const formData = new FormData();
  formData.set("sessionId", sessionId);
  formData.set(
    "file",
    new File(["RAG improves answer trust."], "notes.md", {
      type: "text/markdown",
    }),
  );
  return formData;
}

class FakeUploadRepository {
  insertedRows: Array<Record<string, unknown>> = [];
  deletedDocumentIds: string[] = [];

  constructor(
    private readonly data: {
      session: typeof activeSession | null;
      createError?: Error;
    },
  ) {}

  async findActiveSession() {
    return this.data.session;
  }

  async createUploadDocument(row: Record<string, unknown>) {
    if (this.data.createError) {
      throw this.data.createError;
    }

    this.insertedRows.push(row);
    return { id: String(row.id) };
  }

  async deleteUploadDocument(documentId: string) {
    this.deletedDocumentIds.push(documentId);
  }
}

class FakeUploadStorage {
  uploads: Array<{
    bucket: string;
    path: string;
    bytes: Uint8Array;
    contentType: string;
  }> = [];
  removals: Array<{ bucket: string; paths: string[] }> = [];

  async upload(input: {
    bucket: string;
    path: string;
    bytes: Uint8Array;
    contentType: string;
  }) {
    this.uploads.push(input);
  }

  async remove(input: { bucket: string; paths: string[] }) {
    this.removals.push(input);
  }
}
