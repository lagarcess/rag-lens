"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "rag-lens-theme";

const themeOptions: Array<{
  icon: typeof Monitor;
  label: string;
  value: ThemePreference;
}> = [
  { icon: Monitor, label: "Use system theme", value: "system" },
  { icon: Sun, label: "Use light theme", value: "light" },
  { icon: Moon, label: "Use dark theme", value: "dark" },
];

function getStoredPreference(): ThemePreference {
  try {
    const storedPreference = window.localStorage.getItem(STORAGE_KEY);
    return storedPreference === "light" || storedPreference === "dark"
      ? storedPreference
      : "system";
  } catch {
    return "system";
  }
}

function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;

  if (preference === "system") {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    root.dataset.theme = systemTheme;
    root.dataset.themePreference = "system";
    return;
  }

  root.dataset.theme = preference;
  root.dataset.themePreference = preference;
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") {
      return "system";
    }

    return getStoredPreference();
  });

  useEffect(() => {
    applyTheme(preference);
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => {
      if (preference === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", onSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", onSystemThemeChange);
  }, [preference]);

  function selectTheme(nextPreference: ThemePreference) {
    setPreference(nextPreference);
    applyTheme(nextPreference);

    try {
      if (nextPreference === "system") {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, nextPreference);
      }
    } catch {
      // Theme still applies when storage is unavailable.
    }
  }

  return (
    <div
      aria-label="Theme"
      className={`inline-flex rounded-full border border-[var(--control-border)] bg-[var(--control-bg)] shadow-sm ${
        compact ? "p-0.5" : "p-0.5 sm:p-1"
      }`}
      role="group"
    >
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const selected = preference === option.value;

        return (
          <button
            aria-label={option.label}
            aria-pressed={selected}
            className={`grid place-items-center rounded-full text-[var(--control-muted)] transition hover:text-[var(--foreground)] data-[active=true]:bg-[var(--control-selected)] data-[active=true]:text-[var(--control-selected-fg)] data-[active=true]:shadow-sm ${
              compact ? "size-7" : "size-8 sm:size-9"
            }`}
            data-active={selected}
            data-theme-option={option.value}
            key={option.value}
            onClick={() => selectTheme(option.value)}
            suppressHydrationWarning
            type="button"
          >
            <Icon
              aria-hidden="true"
              className={compact ? "size-3.5" : "size-4"}
              strokeWidth={2}
            />
          </button>
        );
      })}
    </div>
  );
}
