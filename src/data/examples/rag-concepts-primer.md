# RAG Concepts Primer

Retrieval augmented generation improves answer trust by grounding a model's
response in source material. Instead of asking the model to rely only on its
training data, a RAG system first retrieves passages that appear relevant to
the user's question. The answer is then generated from that retrieved context.

Chunking is the step that turns long documents into smaller passages. Good
chunks preserve enough context to make sense on their own while staying small
enough to rank, inspect, and cite. Overlap between chunks helps preserve ideas
that cross a passage boundary.

Embeddings turn text into vectors so related ideas sit near each other in a
vector space. A query embedding can be compared with document chunk embeddings
to find passages that are semantically close to the question. Similarity scores
help explain why specific chunks were retrieved.

Citations connect an answer back to the retrieved chunks that supported it.
They make the answer easier to audit because a reader can compare the final
response with the exact source passages used by the system.

A RAG trace shows the full path from question to answer: source documents,
chunks, retrieval scores, selected context, prompt assembly, model response,
and citations. Inspecting that trace helps developers debug weak retrieval,
missing context, oversized chunks, and unsupported answers.
