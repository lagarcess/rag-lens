# Two-Hop Systems Brief

This brief is a first-party demonstration corpus for multi-hop retrieval. It is
not copied from HotpotQA or any benchmark dataset. The passages are written for
RAG Lens so visitors can ask questions that require combining two related
chunks instead of trusting the first match.

The ingestion memo says anonymous uploads enter a temporary session. Each
uploaded file becomes extracted text, then chunks, then normalized embeddings.
The session record carries a soft expiry for the user interface and a hard
expiry for physical cleanup. Delete-now removes the active session before the
normal expiry window.

The cleanup memo says the cleanup job removes storage objects before deleting
database rows. It only targets expired or deleted anonymous sessions, and it
preserves curated example corpora because examples have no session expiry. The
job logs counts instead of file contents or raw storage paths.

The provider memo says Perplexity creates embeddings while OpenRouter generates
the final answer. The browser never receives provider keys or the Supabase
service-role key. The server route assembles the prompt from retrieved chunks,
calls the answer provider, and records provider metadata in the trace.

The retrieval memo says a two-hop question may need both the ingestion memo and
the cleanup memo. For example, answering how an uploaded file is removed
requires knowing that files belong to temporary sessions and that cleanup
deletes storage objects before database rows.

The deployment memo says Render is the backend and app origin, but not the
public portfolio URL. The deferred public entry is a GitHub Pages landing page
that warms the Render sandbox and shows a theme-aware loading state while the
service starts.
