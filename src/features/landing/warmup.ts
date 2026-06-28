export const WARMUP_COOLDOWN_MS = 5 * 60 * 1000;
export const WARMUP_STORAGE_KEY = "rag-lens-render-warmup-at";

export function shouldRunWarmup(lastWarmupValue: string | null, now = Date.now()) {
  if (!lastWarmupValue) {
    return true;
  }

  const lastWarmupAt = Number(lastWarmupValue);

  if (!Number.isFinite(lastWarmupAt)) {
    return true;
  }

  return now - lastWarmupAt > WARMUP_COOLDOWN_MS;
}

export function buildRenderPath(
  path: string,
  renderOrigin: string | undefined,
  fallbackOrigin: string,
) {
  return new URL(path, getUsableOrigin(renderOrigin, fallbackOrigin)).toString();
}

function getUsableOrigin(renderOrigin: string | undefined, fallbackOrigin: string) {
  if (!renderOrigin?.trim()) {
    return fallbackOrigin;
  }

  try {
    return new URL(renderOrigin).origin;
  } catch {
    return fallbackOrigin;
  }
}
