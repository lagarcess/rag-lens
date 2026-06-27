# Decision 0001: TypeScript-First Next.js Stack

## Decision

Use Next.js App Router, React, TypeScript, Tailwind CSS, and Bun for V1.

## Rationale

- The user prefers Next.js/React and Bun.
- The app is a product workbench, not a Python notebook.
- TypeScript keeps UI, API routes, provider calls, cleanup scripts, and shared types in one language.
- Render can deploy the web service and cron from the same repository.

## Consequence

Python is deferred. If a dedicated extraction worker is later required, add it as a Poetry-managed worker slice.
