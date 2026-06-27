import { describe, expect, test } from "bun:test";

import {
  createMemoryCommandRunner,
  formatPreflightErrorLog,
  formatPreflightLog,
  parseRenderWorkspace,
  runRenderPreflight,
  validateLocalRenderProject,
  type RenderProjectFiles,
} from "./render-preflight";

describe("render-preflight helpers", () => {
  test("validates the local package and Blueprint shape before Render commands", () => {
    expect(validateLocalRenderProject(makeProjectFiles())).toEqual({
      packageName: "rag-lens",
      webServiceName: "rag-lens",
      cronServiceName: "rag-lens-session-cleanup",
    });
  });

  test("rejects package drift before deployment", () => {
    expect(() =>
      validateLocalRenderProject(
        makeProjectFiles({
          packageJson: JSON.stringify({
            name: "rag-lens-copy",
            scripts: {
              build: "next build",
              start: "next start",
              "preflight:render": "bun scripts/render-preflight.ts",
              "cleanup:sessions": "bun scripts/cleanup-expired-sessions.ts",
              "cleanup:sessions:dry-run":
                "bun scripts/cleanup-expired-sessions.ts --dry-run",
            },
          }),
        }),
      ),
    ).toThrow("package.json name must be rag-lens");
  });

  test("rejects hosted Blueprint drift before deployment", () => {
    expect(() =>
      validateLocalRenderProject(
        makeProjectFiles({
          renderYaml: makeRenderYaml({ webRetrievalBackend: "local" }),
        }),
      ),
    ).toThrow("RAG_RETRIEVAL_BACKEND must be supabase");
  });

  test("rejects cleanup cron env bloat before deployment", () => {
    expect(() =>
      validateLocalRenderProject(
        makeProjectFiles({
          renderYaml: makeRenderYaml({
            extraCronEnv: ["PERPLEXITY_API_KEY"],
          }),
        }),
      ),
    ).toThrow("cleanup cron env must only contain");
  });

  test("rejects Render plan drift before deployment", () => {
    expect(() =>
      validateLocalRenderProject(
        makeProjectFiles({
          renderYaml: makeRenderYaml({
            webPlan: "starter",
            cronPlan: "free",
          }),
        }),
      ),
    ).toThrow("plan must be free");
  });

  test("runs local project validation before Render CLI commands", async () => {
    const runner = createMemoryCommandRunner({});

    await expect(
      runRenderPreflight({
        projectFiles: makeProjectFiles({
          packageJson: JSON.stringify({
            name: "rag-lens-copy",
            scripts: {},
          }),
        }),
        runCommand: runner,
        writeOutput: () => undefined,
      }),
    ).rejects.toThrow("package.json name must be rag-lens");
  });

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

function makeProjectFiles(
  overrides: Partial<RenderProjectFiles> = {},
): RenderProjectFiles {
  return {
    packageJson:
      overrides.packageJson ??
      JSON.stringify({
        name: "rag-lens",
        scripts: {
          build: "next build",
          start: "sh -c 'next start -p ${PORT:-3000}'",
          "preflight:render": "bun scripts/render-preflight.ts",
          "cleanup:sessions": "bun scripts/cleanup-expired-sessions.ts",
          "cleanup:sessions:dry-run":
            "bun scripts/cleanup-expired-sessions.ts --dry-run",
        },
      }),
    renderYaml: overrides.renderYaml ?? makeRenderYaml(),
  };
}

function makeRenderYaml(
  input: {
    webRetrievalBackend?: "local" | "supabase";
    webPlan?: "free" | "starter";
    cronPlan?: "free" | "starter";
    extraCronEnv?: string[];
  } = {},
) {
  const extraCronEnv = input.extraCronEnv ?? [];

  return `services:
  - type: web
    name: rag-lens
    repo: https://github.com/lagarcess/rag-lens
    runtime: node
    plan: ${input.webPlan ?? "free"}
    region: ohio
    branch: main
    autoDeploy: true
    buildCommand: bun install --frozen-lockfile && bun run build
    startCommand: bun run start
    healthCheckPath: /api/health
    envVars:
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: PERPLEXITY_API_KEY
        sync: false
      - key: OPENROUTER_API_KEY
        sync: false
      - key: RAG_RETRIEVAL_BACKEND
        value: ${input.webRetrievalBackend ?? "supabase"}
  - type: cron
    name: rag-lens-session-cleanup
    repo: https://github.com/lagarcess/rag-lens
    runtime: node
    plan: ${input.cronPlan ?? "starter"}
    region: ohio
    schedule: "*/30 * * * *"
    buildCommand: bun install --frozen-lockfile
    startCommand: bun run cleanup:sessions
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: SUPABASE_STORAGE_BUCKET
        value: rag-uploads
      - key: CLEANUP_BATCH_SIZE
        value: "100"
${extraCronEnv
  .map(
    (key) => `      - key: ${key}
        sync: false`,
  )
  .join("\n")}
`;
}
