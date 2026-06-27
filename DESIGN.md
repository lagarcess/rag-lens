# rag-lens Design System

## Source Direction

The locked visual direction is a synthesis of three `awesome-design-md` references:

- Supabase: light developer-data shell, emerald accent, product UI mockups, hairline borders.
- Linear: dark precision panels, restrained density, minimal chrome, lavender/blue-style focus discipline.
- Mintlify: readable educational/docs surfaces, code blocks, side navigation, and inline learning context.

Do not copy any one brand. Use these references to shape a distinct RAG observability workbench.

## Product Atmosphere

rag-lens should feel like a technical inspection tool that happens to be polished enough for a recruiter demo. The app should prioritize the real workflow over a marketing landing page:

1. Select an example corpus or upload documents.
2. Ask a question.
3. Inspect the retrieval trace.
4. Learn what each RAG stage did.

The visual tone is calm, precise, and data-native. Avoid decorative gradients, floating blobs, bento filler, and giant explanatory hero sections.

## Color Tokens

| Token | Hex | Role |
| --- | --- | --- |
| `canvas` | `#f8faf9` | App background, light developer-data shell |
| `surface` | `#ffffff` | Primary panels and form surfaces |
| `surface-muted` | `#f1f5f3` | Subtle in-panel background |
| `ink` | `#151917` | Primary text |
| `muted` | `#69746f` | Secondary text and metadata |
| `hairline` | `#d9e1dd` | 1px borders on light panels |
| `dark-canvas` | `#101211` | Trace inspector and prompt panels |
| `dark-surface` | `#171a19` | Chunk cards inside trace inspector |
| `dark-hairline` | `#2a302d` | Borders on dark panels |
| `accent` | `#2bd99f` | Primary signal color, active state, success |
| `accent-strong` | `#13b981` | Primary CTA and selected state |
| `accent-cyan` | `#35c9e8` | Secondary signal for query/prompt stages |
| `danger` | `#d64545` | Failed ingestion and unsafe states |
| `warning` | `#b7791f` | Expiring sessions and low confidence |

Use accent colors sparingly. The product should be mostly neutral with color reserved for state and trace meaning.

## Typography

- Sans: Geist, Inter, system UI.
- Mono: Geist Mono, SFMono-Regular, Menlo, Monaco, Consolas.
- Display headings: 40-56px, 600 weight, tight but readable tracking.
- Panel headings: 14-18px, 600 weight.
- Body: 14-16px, 1.5 line height.
- Trace metadata, IDs, scores, vectors, prompts, and env/config names use mono.

Do not use oversized hero type inside dashboard panels. Keep tool chrome compact.

## Layout Model

Primary app layout:

- Left rail: sources, upload, session state, example corpora.
- Center canvas: question input, answer, citations, retrieval controls.
- Right inspector: dark trace panel with chunks, similarity scores, prompt preview, and model events.
- Secondary tabs or lower panels: experiment controls, chunk viewer, vector details, raw prompt.

Desktop is the primary recruiter demo surface. Mobile must remain readable, but the app may collapse the inspector below the answer.

## Components

### Buttons

- Primary: emerald fill, near-black text, 6px radius, 36-44px height.
- Secondary: white or dark panel fill, hairline border, 6px radius.
- Icon buttons: lucide icons, 16px icon size, accessible labels.

### Panels

- Light panels: white background, 1px hairline, 10-12px radius.
- Dark trace panels: dark background, 1px dark hairline, 10-12px radius.
- Avoid card-inside-card nesting. Use rows, dividers, and section headers inside panels.

### Inputs

- White field on light panels.
- Dark field only inside the trace inspector.
- Always include clear labels and focus rings using emerald/cyan.

### Trace Rows

Each retrieved chunk row should show:

- Rank.
- Similarity score.
- Source document.
- Chunk index or offset.
- Selected/ignored state.
- Expand affordance for full text and metadata.

### Educational Notes

Use compact inline explainers, not large tutorial blocks. A good pattern is a collapsible "Why this matters" note attached to the relevant trace step.

## Do

- Make the real workbench the first screen.
- Let product UI screenshots/traces carry the visual interest.
- Use mono for prompts, vectors, scores, IDs, and config.
- Keep examples and uploads visually distinct.
- Show session expiry and deletion clearly.
- Favor dense but organized tables, rows, and panels.

## Do Not

- Do not copy RAG Play's stage-card layout.
- Do not use dark-only UI for the entire app.
- Do not use gradients or decorative blobs as the main visual idea.
- Do not create a marketing landing page before the app.
- Do not hide retrieval scores or prompt assembly behind vague "AI magic" copy.
- Do not expose secret env vars or provider keys in browser-visible UI.
