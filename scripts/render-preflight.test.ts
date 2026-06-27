import { describe, expect, test } from "bun:test";

import {
  createMemoryCommandRunner,
  formatPreflightErrorLog,
  formatPreflightLog,
  parseRenderWorkspace,
  runRenderPreflight,
} from "./render-preflight";

describe("render-preflight helpers", () => {
  test("parses the active Render workspace JSON", () => {
    expect(
      parseRenderWorkspace(
        JSON.stringify({
          email: "owner@example.com",
          id: "tea-rag-lens",
          name: "RAG Lens",
          type: "team",
        }),
      ),
    ).toEqual({
      id: "tea-rag-lens",
      name: "RAG Lens",
      type: "team",
    });
  });

  test("rejects an unrelated Render workspace before deployment", async () => {
    const runner = createMemoryCommandRunner({
      "render workspace current -o json": {
        exitCode: 0,
        stdout: JSON.stringify({
          email: "owner@example.com",
          id: "tea-argus",
          name: "argus-prod",
          type: "team",
        }),
        stderr: "",
      },
      "render blueprints validate ./render.yaml --output json": {
        exitCode: 0,
        stdout: JSON.stringify({ valid: true }),
        stderr: "",
      },
    });

    await expect(
      runRenderPreflight({
        env: { RENDER_EXPECTED_WORKSPACE_NAME: "RAG Lens" },
        runCommand: runner,
        writeOutput: () => undefined,
      }),
    ).rejects.toThrow("Active Render workspace is argus-prod");
  });

  test("passes only when the workspace and Blueprint are valid", async () => {
    const outputs: string[] = [];
    const runner = createMemoryCommandRunner({
      "render workspace current -o json": {
        exitCode: 0,
        stdout: JSON.stringify({
          email: "owner@example.com",
          id: "tea-rag-lens",
          name: "RAG Lens",
          type: "team",
        }),
        stderr: "",
      },
      "render blueprints validate ./render.yaml --output json": {
        exitCode: 0,
        stdout: JSON.stringify({
          valid: true,
          plan: {
            services: ["rag-lens", "rag-lens-session-cleanup"],
            totalActions: 2,
          },
        }),
        stderr: "",
      },
    });

    const result = await runRenderPreflight({
      env: { RENDER_EXPECTED_WORKSPACE_NAME: "RAG Lens" },
      runCommand: runner,
      writeOutput: (line) => outputs.push(line),
    });

    expect(result).toEqual({
      ok: true,
      workspace: {
        id: "tea-rag-lens",
        name: "RAG Lens",
        type: "team",
      },
      blueprint: {
        valid: true,
        totalActions: 2,
        services: ["rag-lens", "rag-lens-session-cleanup"],
      },
    });
    expect(outputs).toEqual([formatPreflightLog(result)]);
  });

  test("rejects a workspace ID mismatch even when the name matches", async () => {
    const runner = createMemoryCommandRunner({
      "render workspace current -o json": {
        exitCode: 0,
        stdout: JSON.stringify({
          id: "tea-wrong-rag-lens",
          name: "RAG Lens",
          type: "team",
        }),
        stderr: "",
      },
      "render blueprints validate ./render.yaml --output json": {
        exitCode: 0,
        stdout: JSON.stringify({ valid: true }),
        stderr: "",
      },
    });

    await expect(
      runRenderPreflight({
        env: {
          RENDER_EXPECTED_WORKSPACE_NAME: "RAG Lens",
          RENDER_EXPECTED_WORKSPACE_ID: "tea-real-rag-lens",
        },
        runCommand: runner,
        writeOutput: () => undefined,
      }),
    ).rejects.toThrow("expected RAG Lens (tea-real-rag-lens)");
  });

  test("rejects an invalid Blueprint even in the correct workspace", async () => {
    const runner = createMemoryCommandRunner({
      "render workspace current -o json": {
        exitCode: 0,
        stdout: JSON.stringify({
          id: "tea-rag-lens",
          name: "RAG Lens",
          type: "team",
        }),
        stderr: "",
      },
      "render blueprints validate ./render.yaml --output json": {
        exitCode: 1,
        stdout: JSON.stringify({
          valid: false,
          errors: [{ message: "cron plan is not available" }],
        }),
        stderr: "",
      },
    });

    await expect(
      runRenderPreflight({
        env: { RENDER_EXPECTED_WORKSPACE_NAME: "RAG Lens" },
        runCommand: runner,
        writeOutput: () => undefined,
      }),
    ).rejects.toThrow("Render Blueprint validation failed");
  });

  test("formats sanitized error JSON without command stderr or secrets", () => {
    const line = formatPreflightErrorLog({
      error: new Error("Command failed with SUPABASE_SERVICE_ROLE_KEY=secret"),
    });

    expect(line).toBe(
      JSON.stringify({
        ok: false,
        error: "Render preflight failed",
        reason: "Review Render workspace selection and Blueprint validation.",
      }),
    );
    expect(line).not.toContain("secret");
    expect(line).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  test("formats known workspace failures with an actionable safe reason", () => {
    const line = formatPreflightErrorLog({
      error: new Error("Active Render workspace is argus-prod; expected RAG Lens."),
    });

    expect(line).toBe(
      JSON.stringify({
        ok: false,
        error: "Render preflight failed",
        reason: "Active Render workspace is argus-prod; expected RAG Lens.",
      }),
    );
  });
});
