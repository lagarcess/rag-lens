create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.rag_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  mode text not null default 'anonymous' check (mode in ('anonymous', 'example', 'local')),
  status text not null default 'active' check (status in ('active', 'expired', 'deleted')),
  client_label text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 hours',
  hard_expires_at timestamptz not null default now() + interval '24 hours',
  deleted_at timestamptz,
  constraint rag_sessions_expiry_order check (hard_expires_at >= expires_at)
);

create table public.rag_corpora (
  slug text primary key,
  title text not null,
  description text not null,
  source_name text not null,
  source_url text,
  license text,
  is_example boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.rag_documents (
  id uuid primary key default extensions.gen_random_uuid(),
  session_id uuid references public.rag_sessions(id) on delete cascade,
  corpus_slug text references public.rag_corpora(slug) on delete restrict,
  source_kind text not null check (source_kind in ('upload', 'example')),
  file_name text not null,
  mime_type text not null,
  byte_size integer,
  storage_path text,
  checksum text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  extraction_error text,
  extracted_text text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint rag_documents_owner check (
    (source_kind = 'upload' and session_id is not null and corpus_slug is null)
    or
    (source_kind = 'example' and session_id is null and corpus_slug is not null)
  )
);

create table public.rag_document_chunks (
  id uuid primary key default extensions.gen_random_uuid(),
  document_id uuid not null references public.rag_documents(id) on delete cascade,
  session_id uuid references public.rag_sessions(id) on delete cascade,
  corpus_slug text references public.rag_corpora(slug) on delete restrict,
  chunk_index integer not null,
  content text not null,
  char_start integer,
  char_end integer,
  token_count integer,
  embedding_model text not null,
  embedding_mode text not null check (embedding_mode in ('standard', 'contextualized')),
  embedding extensions.vector(1024),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (document_id, chunk_index)
);

create table public.rag_queries (
  id uuid primary key default extensions.gen_random_uuid(),
  session_id uuid references public.rag_sessions(id) on delete cascade,
  corpus_slug text references public.rag_corpora(slug) on delete restrict,
  question text not null,
  answer text,
  answer_model text,
  embedding_model text,
  top_k integer not null default 5,
  chunk_size integer,
  chunk_overlap integer,
  prompt text,
  trace jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint rag_queries_scope check (
    session_id is not null or corpus_slug is not null
  )
);

create table public.rag_retrievals (
  id uuid primary key default extensions.gen_random_uuid(),
  query_id uuid not null references public.rag_queries(id) on delete cascade,
  chunk_id uuid not null references public.rag_document_chunks(id) on delete cascade,
  rank integer not null,
  similarity double precision not null,
  distance double precision not null,
  selected boolean not null default true,
  created_at timestamptz not null default now(),
  unique (query_id, rank)
);

create index rag_sessions_expires_at_idx on public.rag_sessions (expires_at);
create index rag_documents_session_id_idx on public.rag_documents (session_id);
create index rag_documents_corpus_slug_idx on public.rag_documents (corpus_slug);
create index rag_documents_expires_at_idx on public.rag_documents (expires_at);
create index rag_chunks_session_id_idx on public.rag_document_chunks (session_id);
create index rag_chunks_corpus_slug_idx on public.rag_document_chunks (corpus_slug);
create index rag_chunks_document_id_idx on public.rag_document_chunks (document_id);
create index rag_queries_session_id_idx on public.rag_queries (session_id);
create index rag_queries_corpus_slug_idx on public.rag_queries (corpus_slug);
create index rag_retrievals_query_id_idx on public.rag_retrievals (query_id);

create index rag_chunks_embedding_hnsw_idx
on public.rag_document_chunks
using hnsw (embedding extensions.vector_cosine_ops)
where embedding is not null;

alter table public.rag_sessions enable row level security;
alter table public.rag_corpora enable row level security;
alter table public.rag_documents enable row level security;
alter table public.rag_document_chunks enable row level security;
alter table public.rag_queries enable row level security;
alter table public.rag_retrievals enable row level security;

create or replace function public.match_rag_chunks(
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
  file_name text,
  source_kind text,
  corpus_slug text,
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
    documents.file_name,
    documents.source_kind,
    chunks.corpus_slug,
    1 - (chunks.embedding <=> query_embedding) as similarity,
    chunks.embedding <=> query_embedding as distance,
    chunks.metadata
  from public.rag_document_chunks as chunks
  join public.rag_documents as documents
    on documents.id = chunks.document_id
  where chunks.embedding is not null
    and (filter_session_id is null or chunks.session_id = filter_session_id)
    and (filter_corpus_slug is null or chunks.corpus_slug = filter_corpus_slug)
    and (chunks.expires_at is null or chunks.expires_at > now())
    and (documents.expires_at is null or documents.expires_at > now())
    and 1 - (chunks.embedding <=> query_embedding) >= match_threshold
  order by chunks.embedding <=> query_embedding asc
  limit least(match_count, 50);
$$;

create or replace function public.delete_expired_rag_rows(
  p_now timestamptz default now()
)
returns table (
  deleted_sessions bigint,
  deleted_documents bigint
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  deleted_session_count bigint;
  deleted_document_count bigint;
begin
  with deleted_docs as (
    delete from public.rag_documents
    where source_kind = 'upload'
      and expires_at is not null
      and expires_at <= p_now
    returning id
  )
  select count(*) into deleted_document_count from deleted_docs;

  with deleted_sessions_cte as (
    delete from public.rag_sessions
    where hard_expires_at <= p_now
       or expires_at <= p_now
       or deleted_at is not null
    returning id
  )
  select count(*) into deleted_session_count from deleted_sessions_cte;

  return query select deleted_session_count, deleted_document_count;
end;
$$;

insert into public.rag_corpora (
  slug,
  title,
  description,
  source_name,
  source_url,
  license,
  is_example
) values
  (
    'rag-concepts-primer',
    'RAG Concepts Primer',
    'A small first-party primer used for predictable walkthroughs of chunking, retrieval, prompt assembly, and citations.',
    'rag-lens',
    'https://github.com/',
    'Project-authored demo text',
    true
  ),
  (
    'scifact-mini',
    'SciFact Mini',
    'A planned small attributed subset for evidence retrieval and claim-support demos.',
    'BEIR SciFact',
    'https://github.com/beir-cellar/beir',
    'Dataset license must be confirmed before bundling text',
    true
  ),
  (
    'hotpotqa-mini',
    'HotpotQA Mini',
    'A planned small attributed subset for multi-hop retrieval demos.',
    'HotpotQA',
    'https://hotpotqa.github.io/',
    'Dataset license must be confirmed before bundling text',
    true
  )
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  license = excluded.license,
  is_example = excluded.is_example;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'rag-uploads',
  'rag-uploads',
  false,
  10485760,
  array['application/pdf', 'text/plain', 'text/markdown', 'text/x-markdown']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
