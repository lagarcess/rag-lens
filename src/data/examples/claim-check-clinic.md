# Claim Check Clinic

This clinic is a first-party demonstration corpus for evidence retrieval. It is
not copied from SciFact, BEIR, or any benchmark dataset. The passages are short
research-style notes written for RAG Lens so visitors can test whether retrieved
evidence actually supports a claim.

The demo claim is: citation links improve answer auditability in a RAG system.
The supporting evidence says that a grounded answer should expose the passages
used during generation, because citations let a reader compare the response
against the exact source text. A trace is stronger when it includes the selected
chunks, the similarity scores, and the final prompt that sent those chunks to
the model.

A separate note warns that retrieval scores are not proof of truth. A high
similarity score only means the query and passage are close according to the
retrieval method. The passage may still be stale, incomplete, contradicted by
another chunk, or irrelevant to the specific claim. RAG Lens should therefore
show the ranked evidence and encourage users to inspect the cited text.

The unsupported claim is: a RAG answer becomes trustworthy as soon as any vector
match is found. The corpus does not support that claim. Trust improves only when
retrieval finds relevant passages, the prompt uses those passages faithfully,
and citations make the answer auditable.

The contradiction example is: larger chunks always improve citation quality.
The evidence says oversized chunks can hide the exact sentence that supports an
answer. Smaller focused chunks are often easier to inspect, while too much
overlap can add duplicated context and inflate prompt size.
