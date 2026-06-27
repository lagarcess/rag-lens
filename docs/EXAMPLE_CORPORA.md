# Example Corpora Plan

Examples are the default public path so recruiters can try the app without
uploading files.

## V1 Corpora

### RAG Concepts Primer

First-party text written for this project. Use it first because it is predictable, license-clean, and directly teaches RAG.

### Claim Check Clinic

Purpose: evidence retrieval and claim-support demos.

Source: original first-party text written for RAG Lens.

This corpus is not derived from SciFact, BEIR, or any benchmark dataset. It uses
short research-style notes to show that a retrieved passage can support,
contradict, or fail to answer a claim.

### Two-Hop Systems Brief

Purpose: multi-hop retrieval where one chunk is not enough.

Source: original first-party text written for RAG Lens.

This corpus is not derived from HotpotQA or any benchmark dataset. It uses
related memos so a useful answer needs evidence from more than one retrieved
chunk.

## Selection Rules

- Keep each corpus small enough for fast public demos.
- Include source attribution in the UI.
- Prefer documents with questions that demonstrate retrieval strengths and failures.
- Benchmark-inspired task patterns are acceptable; benchmark names, records,
  questions, abstracts, snippets, and labels are not bundled unless separately
  license-reviewed.
- Do not seed large benchmark corpora into the public app.
