alter table public.rag_documents
  add column if not exists hard_expires_at timestamptz;

alter table public.rag_document_chunks
  add column if not exists hard_expires_at timestamptz;

alter table public.rag_queries
  add column if not exists hard_expires_at timestamptz;

alter table public.rag_retrievals
  add column if not exists session_id uuid references public.rag_sessions(id) on delete cascade,
  add column if not exists expires_at timestamptz,
  add column if not exists hard_expires_at timestamptz;

drop index if exists rag_retrievals_session_id_idx;
create index rag_retrievals_session_id_idx on public.rag_retrievals (session_id);

drop index if exists rag_retrievals_expires_at_idx;
create index rag_retrievals_expires_at_idx on public.rag_retrievals (expires_at);

alter table public.rag_documents
  drop constraint if exists rag_documents_owner;

alter table public.rag_documents
  add constraint rag_documents_owner check (
    (
      source_kind = 'upload'
      and session_id is not null
      and corpus_slug is null
      and expires_at is not null
      and hard_expires_at is not null
      and hard_expires_at >= expires_at
    )
    or
    (
      source_kind = 'example'
      and session_id is null
      and corpus_slug is not null
      and expires_at is null
      and hard_expires_at is null
    )
  );

alter table public.rag_document_chunks
  drop constraint if exists rag_chunks_scope;

alter table public.rag_document_chunks
  add constraint rag_chunks_scope check (
    (
      session_id is not null
      and corpus_slug is null
      and expires_at is not null
      and hard_expires_at is not null
      and hard_expires_at >= expires_at
    )
    or
    (
      session_id is null
      and corpus_slug is not null
      and expires_at is null
      and hard_expires_at is null
    )
  );

alter table public.rag_queries
  drop constraint if exists rag_queries_scope;

alter table public.rag_queries
  add constraint rag_queries_scope check (
    (
      session_id is not null
      and expires_at is not null
      and hard_expires_at is not null
      and hard_expires_at >= expires_at
    )
    or
    (
      session_id is null
      and corpus_slug is not null
      and expires_at is null
      and hard_expires_at is null
    )
  );

alter table public.rag_retrievals
  drop constraint if exists rag_retrievals_scope;

alter table public.rag_retrievals
  add constraint rag_retrievals_scope check (
    (
      session_id is not null
      and expires_at is not null
      and hard_expires_at is not null
      and hard_expires_at >= expires_at
    )
    or
    (
      session_id is null
      and expires_at is null
      and hard_expires_at is null
    )
  );

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
      and hard_expires_at is not null
      and hard_expires_at <= p_now
    returning id
  )
  select count(*) into deleted_document_count from deleted_docs;

  with deleted_sessions_cte as (
    delete from public.rag_sessions
    where hard_expires_at <= p_now
       or deleted_at is not null
    returning id
  )
  select count(*) into deleted_session_count from deleted_sessions_cte;

  return query select deleted_session_count, deleted_document_count;
end;
$$;

revoke all on table
  public.rag_sessions,
  public.rag_corpora,
  public.rag_documents,
  public.rag_document_chunks,
  public.rag_queries,
  public.rag_retrievals
from anon, authenticated;

grant usage on schema public to service_role;

grant select, insert, update, delete on table
  public.rag_sessions,
  public.rag_corpora,
  public.rag_documents,
  public.rag_document_chunks,
  public.rag_queries,
  public.rag_retrievals
to service_role;

revoke execute on function public.match_rag_chunks(
  extensions.vector(1024),
  integer,
  double precision,
  uuid,
  text
) from public, anon, authenticated;

revoke execute on function public.delete_expired_rag_rows(timestamptz)
from public, anon, authenticated;

grant execute on function public.match_rag_chunks(
  extensions.vector(1024),
  integer,
  double precision,
  uuid,
  text
) to service_role;

grant execute on function public.delete_expired_rag_rows(timestamptz)
to service_role;
