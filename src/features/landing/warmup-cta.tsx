"use client";

import Image from "next/image";
import { ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  buildRenderPath,
  shouldRunWarmup,
  WARMUP_STORAGE_KEY,
} from "@/features/landing/warmup";

const WARMUP_ATTEMPT_TIMEOUT_MS = 7_000;
const WARMUP_MAX_WAIT_MS = 45_000;
const WARMUP_POLL_DELAY_MS = 1_800;

type WarmupState = "idle" | "warming" | "slow";

export function LandingWarmupCta() {
  const [state, setState] = useState<WarmupState>("idle");
  const paths = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return {
      warmup: buildRenderPath(
        "/api/warmup",
        process.env.NEXT_PUBLIC_SITE_URL,
        window.location.origin,
      ),
      workbench: buildRenderPath(
        "/workbench",
        process.env.NEXT_PUBLIC_SITE_URL,
        window.location.origin,
      ),
    };
  }, []);

  useEffect(() => {
    if (!paths) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void prewarmRender(paths.warmup);
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [paths]);

  async function openWorkbench() {
    if (!paths || state === "warming") {
      return;
    }

    if (!shouldWarmupNow()) {
      window.location.assign(paths.workbench);
      return;
    }

    setState("warming");
    const warmed = await waitForRender(paths.warmup);

    if (warmed) {
      rememberWarmup();
      window.location.assign(paths.workbench);
      return;
    }

    setState("slow");
  }

  const isWarming = state === "warming";

  return (
    <div className="w-full max-w-xl">
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-button-fg)] transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-wait disabled:opacity-80"
          disabled={isWarming}
          onClick={() => void openWorkbench()}
          type="button"
        >
          {isWarming ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Warming Render
            </>
          ) : state === "slow" ? (
            <>
              <RefreshCw className="size-4" />
              Retry warmup
            </>
          ) : (
            <>
              Open workbench
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
        {state === "slow" && paths ? (
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent-strong)]"
            href={paths.workbench}
          >
            Open anyway
          </a>
        ) : null}
      </div>

      {isWarming || state === "slow" ? (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="relative mt-0.5 size-10 shrink-0">
            <Image
              alt=""
              className="theme-logo-light size-10 object-cover"
              height={40}
              src="/brand/rag-lens-logo-light-mark.png"
              width={40}
            />
            <Image
              alt=""
              className="theme-logo-dark size-10 object-cover"
              height={40}
              src="/brand/rag-lens-logo-dark-mark.png"
              width={40}
            />
          </div>
          <div>
            <p className="text-sm font-semibold">
              {isWarming
                ? "Starting the RAG Lens sandbox"
                : "Render is taking longer than usual"}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              This only checks <span className="font-mono">/api/warmup</span>.
              It does not create a session, upload files, query Supabase, or call
              model providers.
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          The CTA warms the Render sandbox first, then opens the workbench when
          it is ready.
        </p>
      )}
    </div>
  );
}

async function prewarmRender(warmupUrl: string) {
  if (!shouldWarmupNow()) {
    return;
  }

  try {
    await pingWarmup(warmupUrl, WARMUP_ATTEMPT_TIMEOUT_MS);
    rememberWarmup();
  } catch {
    // The explicit CTA path handles visible retry and timeout states.
  }
}

async function waitForRender(warmupUrl: string) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < WARMUP_MAX_WAIT_MS) {
    try {
      await pingWarmup(warmupUrl, WARMUP_ATTEMPT_TIMEOUT_MS);
      return true;
    } catch {
      await delay(WARMUP_POLL_DELAY_MS);
    }
  }

  return false;
}

async function pingWarmup(warmupUrl: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(warmupUrl, {
      cache: "no-store",
      mode: "cors",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("Warmup request failed");
    }
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function shouldWarmupNow() {
  try {
    return shouldRunWarmup(window.localStorage.getItem(WARMUP_STORAGE_KEY));
  } catch {
    return true;
  }
}

function rememberWarmup() {
  try {
    window.localStorage.setItem(WARMUP_STORAGE_KEY, String(Date.now()));
  } catch {
    // Navigation still works when localStorage is unavailable.
  }
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
