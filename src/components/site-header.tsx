import Image from "next/image";
import Link from "next/link";
import { GitHubMark } from "@/components/github-mark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full shrink-0 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link className="flex min-w-0 items-center gap-3" href="/">
          <Image
            alt="RAG Lens logo"
            className="theme-logo-light size-10 object-cover"
            height={40}
            priority
            src="/brand/rag-lens-logo-light-mark.png"
            width={40}
          />
          <Image
            alt="RAG Lens logo"
            className="theme-logo-dark size-10 object-cover"
            height={40}
            priority
            src="/brand/rag-lens-logo-dark-mark.png"
            width={40}
          />
          <span>
            <span className="block text-sm font-semibold tracking-tight">
              RAG <span className="text-[var(--accent-strong)]">Lens</span>
            </span>
          </span>
        </Link>

        <a
          aria-label="View source on GitHub"
          className="inline-flex size-9 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          href="https://github.com/lagarcess/rag-lens"
          rel="noopener nofollow"
          target="_blank"
        >
          <GitHubMark className="size-5" />
        </a>
      </div>
    </header>
  );
}
