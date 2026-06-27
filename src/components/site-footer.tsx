import { ThemeToggle } from "@/components/theme-toggle";

type SiteFooterProps = {
  wide?: boolean;
};

export function SiteFooter({ wide = false }: SiteFooterProps) {
  const containerClass = wide
    ? "mx-auto flex min-h-24 max-w-[1800px] items-center justify-between gap-4 px-6 py-5 lg:px-8"
    : "mx-auto flex min-h-24 max-w-7xl items-center justify-between gap-4 px-6 py-5";

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className={containerClass}>
        <p className="text-sm text-[var(--muted)]">
          Built by{" "}
          <a
            className="underline underline-offset-4 hover:text-[var(--foreground)]"
            href="https://github.com/lagarcess"
            rel="noopener nofollow"
            target="_blank"
          >
            lagarcess
          </a>
          . The source code is available on{" "}
          <a
            className="underline underline-offset-4 hover:text-[var(--foreground)]"
            href="https://github.com/lagarcess/rag-lens"
            rel="noopener nofollow"
            target="_blank"
          >
            GitHub
          </a>
          .
        </p>
        <ThemeToggle compact />
      </div>
    </footer>
  );
}
