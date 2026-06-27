# Example Corpora Plan

Examples are the default public path so recruiters can try the app without uploading files.

## V1 Corpora

### RAG Concepts Primer

First-party text written for this project. Use it first because it is predictable, license-clean, and directly teaches RAG.

### SciFact Mini

Purpose: evidence retrieval and claim-support demos.

Source: BEIR SciFact.

Action before bundling: confirm exact dataset license and attribution requirements.

### HotpotQA Mini

Purpose: multi-hop retrieval where one chunk is not enough.

Source: HotpotQA.

Action before bundling: confirm exact dataset license and attribution requirements.

## Selection Rules

- Keep each corpus small enough for fast public demos.
- Include source attribution in the UI.
- Prefer documents with questions that demonstrate retrieval strengths and failures.
- Do not seed large benchmark corpora into the public app.
