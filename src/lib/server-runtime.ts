export function assertServerRuntime() {
  if (typeof window !== "undefined") {
    throw new Error("This module is server-only and cannot run in the browser.");
  }
}
