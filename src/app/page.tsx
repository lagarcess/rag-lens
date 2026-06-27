import { ArrowRight, FileText, ScanSearch, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const landingCards = [
  {
    icon: FileText,
    title: "Add your docs",
    text: "Use a sample set now, then upload your own files when the sandbox is connected.",
  },
  {
    icon: ScanSearch,
    title: "Ask a question",
    text: "Run a question against the selected documents and get a grounded answer.",
  },
  {
    icon: SlidersHorizontal,
    title: "Check the answer",
    text: "See which passages were used, where they came from, and why they matched.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col overflow-x-clip bg-[var(--background)] text-[var(--foreground)]">
      <SiteHeader />

      <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-5xl font-semibold leading-[0.95] tracking-[-0.045em] md:text-7xl">
            RAG <span className="text-[var(--accent-strong)]">Lens</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl font-mono text-sm leading-7 text-[var(--muted)] md:text-base">
            Retrieve, Inspect, Understand{" "}
            <span className="text-[var(--accent-strong)]">RAG.</span>
          </p>
          <div className="mt-8">
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-button-fg)] transition hover:brightness-95"
              href="/workbench"
            >
              Open workbench
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-20 grid w-full max-w-5xl gap-5 md:grid-cols-3">
          {landingCards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left transition hover:border-[var(--accent-strong)]"
                href="/workbench"
                key={card.title}
              >
                <Icon className="mb-5 size-5 text-[var(--accent-strong)]" />
                <h2 className="text-base font-semibold">{card.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  {card.text}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
