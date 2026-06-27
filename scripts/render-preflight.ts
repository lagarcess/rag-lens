import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

declare const Bun: {
  YAML: {
    parse(input: string): unknown;
  };
};

export interface RenderWorkspace {
  id: string;
  name: string;
  type?: string;
}

export interface RenderBlueprintSummary {
  valid: boolean;
  totalActions: number | null;
  services: string[];
  errors: string[];
}

export interface RenderPreflightResult {
  ok: true;
  workspace: RenderWorkspace;
  blueprint: RenderBlueprintSummary;
}

export interface RenderProjectFiles {
  packageJson: string;
  renderYaml: string;
}

export interface LocalRenderProjectSummary {
  packageName: string;
  webServiceName: string;
  cleanupOwner: "supabase-cron";
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
  projectFiles?: RenderProjectFiles;
  readProjectFiles?: () => Promise<RenderProjectFiles>;
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

export function validateLocalRenderProject(
  files: RenderProjectFiles,
): LocalRenderProjectSummary {
  const packageJson = parseJsonObject(files.packageJson, "package.json");
  const packageName = getStringProperty(packageJson, "name");

  if (packageName !== "rag-lens") {
    throwLocalProjectError("package.json name must be rag-lens.");
  }

  const scripts = getRecordProperty(packageJson, "scripts");
  const requiredScripts = [
    "build",
    "start",
    "preflight:render",
    "cleanup:sessions",
    "cleanup:sessions:dry-run",
  ];

  for (const scriptName of requiredScripts) {
    if (typeof scripts[scriptName] !== "string" || !scripts[scriptName]) {
      throwLocalProjectError(`package.json scripts.${scriptName} is required.`);
    }
  }

  const blueprint = parseYamlObject(files.renderYaml, "render.yaml");
  const services = getArrayProperty(blueprint, "services");
  const webService = findService(services, "rag-lens", "web");

  validateWebService(webService);

  if (services.some((service) => isRecord(service) && service.type === "cron")) {
    throwLocalProjectError(
      "cleanup must be owned by Supabase Cron; render.yaml must not define Render cron services.",
    );
  }

  if (services.some((service) => serviceHasEnvKey(service, "SUPABASE_PROJECT_REF"))) {
    throwLocalProjectError(
      "render.yaml must not include SUPABASE_PROJECT_REF in runtime env vars.",
    );
  }

  return {
    packageName,
    webServiceName: "rag-lens",
    cleanupOwner: "supabase-cron",
  };
}

export async function runRenderPreflight(options: RenderPreflightOptions = {}) {
  const env = options.env ?? process.env;
  const runCommand = options.runCommand ?? runShellCommand;
  const projectFiles =
    options.projectFiles ??
    (await (options.readProjectFiles ?? readLocalRenderProjectFiles)());
  const expectedWorkspaceName =
    env.RENDER_EXPECTED_WORKSPACE_NAME?.trim() || "rag-lens";
  const expectedWorkspaceId = env.RENDER_EXPECTED_WORKSPACE_ID?.trim();

  validateLocalRenderProject(projectFiles);

  const workspaceCommand = await runCommand("render", [
    "workspace",
    "current",
    "-o",
    "json",
  ]);

  if (workspaceCommand.exitCode !== 0) {
    throw new Error(
      "Render workspace lookup failed. Run render login and select the dedicated rag-lens workspace before deploying.",
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
      formatBlueprintValidationFailure(blueprint),
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

async function readLocalRenderProjectFiles(): Promise<RenderProjectFiles> {
  const [packageJson, renderYaml] = await Promise.all([
    readFile("package.json", "utf8"),
    readFile("render.yaml", "utf8"),
  ]);

  return { packageJson, renderYaml };
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
  const errors = parseBlueprintErrors(parsed.errors);

  return {
    valid,
    totalActions,
    services,
    errors,
  };
}

function parseBlueprintErrors(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      if (typeof entry.error === "string") {
        return entry.error;
      }

      if (typeof entry.message === "string") {
        return entry.message;
      }

      return null;
    })
    .filter((message): message is string => Boolean(message));
}

function formatBlueprintValidationFailure(blueprint: RenderBlueprintSummary) {
  const suffix =
    blueprint.errors.length > 0 ? `: ${blueprint.errors.join(", ")}` : ".";

  return `Render Blueprint validation failed${suffix} Run render blueprints validate ./render.yaml --output json and fix render.yaml before deploying.`;
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

function parseYamlObject(rawYaml: string, label: string) {
  try {
    const parsed: unknown = Bun.YAML.parse(rawYaml);

    if (!isRecord(parsed)) {
      throw new Error("not an object");
    }

    return parsed;
  } catch {
    throwLocalProjectError(`${label} is not valid YAML.`);
  }
}

function validateWebService(service: Record<string, unknown>) {
  requireField(service, "repo", "https://github.com/lagarcess/rag-lens");
  requireField(service, "runtime", "node");
  requireField(service, "plan", "free");
  requireField(service, "region", "ohio");
  requireField(service, "branch", "main");
  requireBooleanField(service, "autoDeploy", true);
  requireField(service, "buildCommand", "bun install --frozen-lockfile && bun run build");
  requireField(service, "startCommand", "bun run start");
  requireField(service, "healthCheckPath", "/api/health");

  const env = getEnvVarMap(service);
  const retrievalBackend = env.get("RAG_RETRIEVAL_BACKEND");

  if (retrievalBackend?.value !== "supabase") {
    throwLocalProjectError(
      "render.yaml web service RAG_RETRIEVAL_BACKEND must be supabase.",
    );
  }

  for (const key of [
    "SUPABASE_SERVICE_ROLE_KEY",
    "PERPLEXITY_API_KEY",
    "OPENROUTER_API_KEY",
  ]) {
    const entry = env.get(key);

    if (!entry || entry.sync !== false || "value" in entry) {
      throwLocalProjectError(
        `render.yaml web service ${key} must use sync: false with no literal value.`,
      );
    }
  }
}

function getStringProperty(input: Record<string, unknown>, key: string) {
  return typeof input[key] === "string" ? input[key] : null;
}

function getRecordProperty(input: Record<string, unknown>, key: string) {
  const value = input[key];

  if (!isRecord(value)) {
    throwLocalProjectError(`${key} must be an object.`);
  }

  return value;
}

function getArrayProperty(input: Record<string, unknown>, key: string) {
  const value = input[key];

  if (!Array.isArray(value)) {
    throwLocalProjectError(`${key} must be an array.`);
  }

  return value;
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

function findService(services: unknown[], name: string, type: string) {
  const service = services.find(
    (candidate) =>
      isRecord(candidate) &&
      candidate.name === name &&
      candidate.type === type,
  );

  if (!isRecord(service)) {
    throwLocalProjectError(`render.yaml must define ${type} service ${name}.`);
  }

  return service;
}

function requireField(
  service: Record<string, unknown>,
  field: string,
  expected: string,
) {
  if (service[field] !== expected) {
    throwLocalProjectError(
      `render.yaml service ${String(service.name)} ${field} must be ${expected}.`,
    );
  }
}

function requireBooleanField(
  service: Record<string, unknown>,
  field: string,
  expected: boolean,
) {
  if (service[field] !== expected) {
    throwLocalProjectError(
      `render.yaml service ${String(service.name)} ${field} must be ${String(expected)}.`,
    );
  }
}

type EnvVarEntry = Record<string, unknown> & { key: string };

function getEnvVarMap(service: Record<string, unknown>) {
  const envVars = getArrayProperty(service, "envVars");
  const entries = new Map<string, EnvVarEntry>();

  for (const entry of envVars) {
    if (!isRecord(entry) || typeof entry.key !== "string") {
      throwLocalProjectError(
        `render.yaml service ${String(service.name)} envVars entries must have keys.`,
      );
    }

    entries.set(entry.key, entry as EnvVarEntry);
  }

  return entries;
}

function serviceHasEnvKey(service: unknown, key: string) {
  if (!isRecord(service) || !Array.isArray(service.envVars)) {
    return false;
  }

  return service.envVars.some(
    (entry) => isRecord(entry) && entry.key === key,
  );
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
    "Local Render project check failed.",
    "Render workspace lookup failed.",
    "Render Blueprint validation failed",
    "Render workspace current output is ",
    "Render Blueprint validation output is ",
  ];

  if (safePrefixes.some((prefix) => error.message.startsWith(prefix))) {
    return error.message;
  }

  return fallback;
}

function throwLocalProjectError(message: string): never {
  throw new Error(`Local Render project check failed. ${message}`);
}

if (process.argv[1]?.endsWith("render-preflight.ts")) {
  runRenderPreflight().catch((error) => {
    console.error(formatPreflightErrorLog({ error }));
    process.exitCode = 1;
  });
}
