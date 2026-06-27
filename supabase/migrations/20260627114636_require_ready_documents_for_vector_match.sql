drop function if exists public.match_rag_chunks(
  extensions.vector(1024),
  integer,
  double precision,
  uuid,
  text
);

create function public.match_rag_chunks(
  query_embedding extensions.vector(1024),
  match_count integer default 5,
  match_threshold double precision default 0,
  filter_session_id uuid default null,
  filter_corpus_slug text default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  chunk_index integer,
  char_start integer,
  char_end integer,
  file_name text,
  source_kind text,
  corpus_slug text,
  embedding_model text,
  embedding_mode text,
  similarity double precision,
  distance double precision,
  metadata jsonb
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    chunks.id as chunk_id,
    chunks.document_id,
    chunks.content,
    chunks.chunk_index,
    chunks.char_start,
    chunks.char_end,
    documents.file_name,
    documents.source_kind,
    chunks.corpus_slug,
    chunks.embedding_model,
    chunks.embedding_mode,
    1 - (chunks.embedding <=> query_embedding) as similarity,
    chunks.embedding <=> query_embedding as distance,
    chunks.metadata
  from public.rag_document_chunks as chunks
  join public.rag_documents as documents
    on documents.id = chunks.document_id
  where chunks.embedding is not null
    and documents.status = 'ready'
    and (filter_session_id is null or chunks.session_id = filter_session_id)
    and (filter_corpus_slug is null or chunks.corpus_slug = filter_corpus_slug)
    and (chunks.expires_at is null or chunks.expires_at > now())
    and (documents.expires_at is null or documents.expires_at > now())
    and 1 - (chunks.embedding <=> query_embedding) >= match_threshold
  order by chunks.embedding <=> query_embedding asc
  limit least(match_count, 50);
$$;

revoke execute on function public.match_rag_chunks(
  extensions.vector(1024),
  integer,
  double precision,
  uuid,
  text
) from public, anon, authenticated;

grant execute on function public.match_rag_chunks(
  extensions.vector(1024),
  integer,
  double precision,
  uuid,
  text
) to service_role;
