import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WorkbenchClient } from "@/features/workbench/workbench-client";

export default function Workbench() {
  return (
    <main className="flex min-h-screen flex-col overflow-x-clip bg-[var(--background)] text-[var(--foreground)]">
      <SiteHeader wide />
      <WorkbenchClient />
      <SiteFooter wide />
    </main>
  );
}
