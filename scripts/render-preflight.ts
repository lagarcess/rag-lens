import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface RenderWorkspace {
  id: string;
  name: string;
  type?: string;
}

export interface RenderBlueprintSummary {
  valid: boolean;
  totalActions: number | null;
  services: string[];
}

export interface RenderPreflightResult {
  ok: true;
  workspace: RenderWorkspace;
  blueprint: RenderBlueprintSummary;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type CommandRunner = (
  command: string,
  args: string[],
) => Promise<CommandResult>;

export interface RenderPreflightOptions {
  env?: Record<string, string | undefined>;
  runCommand?: CommandRunner;
  writeOutput?: (line: string) => void;
}

export function parseRenderWorkspace(rawJson: string): RenderWorkspace {
  const parsed = parseJsonObject(rawJson, "Render workspace current output");
  const id = getStringProperty(parsed, "id");
  const name = getStringProperty(parsed, "name");
  const type = getOptionalStringProperty(parsed, "type");

  if (!id || !name) {
    throw new Error("Render workspace current output is missing id or name");
  }

  return { id, name, ...(type ? { type } : {}) };
}

export function formatPreflightLog(result: RenderPreflightResult) {
  return JSON.stringify(result);
}

export function formatPreflightErrorLog(_input: { error: unknown }) {
  return JSON.stringify({
    ok: false,
    error: "Render preflight failed",
    reason: getSafeErrorReason(_input.error),
  });
}

export function createMemoryCommandRunner(
  responses: Record<string, CommandResult>,
): CommandRunner {
  return async (command, args) => {
    const key = formatCommandKey(command, args);
    const response = responses[key];

    if (!response) {
      return {
        exitCode: 127,
        stdout: "",
        stderr: `No fixture for command: ${key}`,
      };
    }

    return response;
  };
}

export async function runRenderPreflight(options: RenderPreflightOptions = {}) {
  const env = options.env ?? process.env;
  const runCommand = options.runCommand ?? runShellCommand;
  const expectedWorkspaceName =
    env.RENDER_EXPECTED_WORKSPACE_NAME?.trim() || "RAG Lens";
  const expectedWorkspaceId = env.RENDER_EXPECTED_WORKSPACE_ID?.trim();

  const workspaceCommand = await runCommand("render", [
    "workspace",
    "current",
    "-o",
    "json",
  ]);

  if (workspaceCommand.exitCode !== 0) {
    throw new Error(
      "Render workspace lookup failed. Run render login and select the dedicated RAG Lens workspace before deploying.",
    );
  }

  const workspace = parseRenderWorkspace(workspaceCommand.stdout);
  validateExpectedWorkspace({
    workspace,
    expectedWorkspaceName,
    expectedWorkspaceId,
  });

  const blueprintCommand = await runCommand("render", [
    "blueprints",
    "validate",
    "./render.yaml",
    "--output",
    "json",
  ]);
  const blueprint = parseBlueprintSummary(blueprintCommand.stdout);

  if (blueprintCommand.exitCode !== 0 || !blueprint.valid) {
    throw new Error(
      "Render Blueprint validation failed. Run render blueprints validate ./render.yaml --output json and fix render.yaml before deploying.",
    );
  }

  const result: RenderPreflightResult = {
    ok: true,
    workspace,
    blueprint,
  };

  (options.writeOutput ?? console.log)(formatPreflightLog(result));

  return result;
}

async function runShellCommand(
  command: string,
  args: string[],
): Promise<CommandResult> {
  try {
    const result = await execFileAsync(command, args, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0,
    };
  } catch (error) {
    const commandError = error as {
      stdout?: string;
      stderr?: string;
      code?: number;
    };

    return {
      stdout: commandError.stdout ?? "",
      stderr: commandError.stderr ?? "",
      exitCode:
        typeof commandError.code === "number" ? commandError.code : 1,
    };
  }
}

function validateExpectedWorkspace(input: {
  workspace: RenderWorkspace;
  expectedWorkspaceName: string;
  expectedWorkspaceId?: string;
}) {
  if (
    input.expectedWorkspaceId &&
    input.workspace.id !== input.expectedWorkspaceId
  ) {
    throw new Error(
      `Active Render workspace is ${input.workspace.name} (${input.workspace.id}); expected ${input.expectedWorkspaceName} (${input.expectedWorkspaceId}). Run render workspaces and render workspace set <rag-lens-workspace-id> before deploying.`,
    );
  }

  if (
    !input.expectedWorkspaceId &&
    input.workspace.name !== input.expectedWorkspaceName
  ) {
    throw new Error(
      `Active Render workspace is ${input.workspace.name}; expected ${input.expectedWorkspaceName}. Run render workspaces and render workspace set <rag-lens-workspace-id> before deploying.`,
    );
  }
}

function parseBlueprintSummary(rawJson: string): RenderBlueprintSummary {
  const parsed = parseJsonObject(rawJson, "Render Blueprint validation output");
  const valid = parsed.valid === true;
  const plan = isRecord(parsed.plan) ? parsed.plan : {};
  const services = Array.isArray(plan.services)
    ? plan.services.filter(
        (service): service is string => typeof service === "string",
      )
    : [];
  const totalActions =
    typeof plan.totalActions === "number" ? plan.totalActions : null;

  return {
    valid,
    totalActions,
    services,
  };
}

function parseJsonObject(rawJson: string, label: string) {
  try {
    const parsed: unknown = JSON.parse(rawJson);

    if (!isRecord(parsed)) {
      throw new Error("not an object");
    }

    return parsed;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

function getStringProperty(input: Record<string, unknown>, key: string) {
  return typeof input[key] === "string" ? input[key] : null;
}

function getOptionalStringProperty(
  input: Record<string, unknown>,
  key: string,
) {
  return typeof input[key] === "string" ? input[key] : undefined;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function formatCommandKey(command: string, args: string[]) {
  return [command, ...args].join(" ");
}

function getSafeErrorReason(error: unknown) {
  const fallback = "Review Render workspace selection and Blueprint validation.";

  if (!(error instanceof Error)) {
    return fallback;
  }

  const safePrefixes = [
    "Active Render workspace is ",
    "Render workspace lookup failed.",
    "Render Blueprint validation failed.",
    "Render workspace current output is ",
    "Render Blueprint validation output is ",
  ];

  if (safePrefixes.some((prefix) => error.message.startsWith(prefix))) {
    return error.message;
  }

  return fallback;
}

if (process.argv[1]?.endsWith("render-preflight.ts")) {
  runRenderPreflight().catch((error) => {
    console.error(formatPreflightErrorLog({ error }));
    process.exitCode = 1;
  });
}
