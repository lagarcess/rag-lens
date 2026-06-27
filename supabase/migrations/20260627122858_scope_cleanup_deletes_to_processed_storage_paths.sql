drop function if exists public.delete_expired_rag_rows(timestamptz);

create function public.delete_expired_rag_rows(
  p_now timestamptz default now(),
  p_storage_paths text[] default '{}'::text[]
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
  with path_input as (
    select distinct storage_path
    from unnest(coalesce(p_storage_paths, '{}'::text[])) as input_path(storage_path)
    where storage_path is not null
      and btrim(storage_path) <> ''
  ),
  deleted_docs as (
    delete from public.rag_documents as documents
    where documents.source_kind = 'upload'
      and (
        documents.storage_path in (select path_input.storage_path from path_input)
        or documents.storage_path is null
      )
      and (
        (
          documents.hard_expires_at is not null
          and documents.hard_expires_at <= p_now
        )
        or exists (
          select 1
          from public.rag_sessions as sessions
          where sessions.id = documents.session_id
            and (
              sessions.status = 'deleted'
              or sessions.deleted_at is not null
            )
        )
      )
    returning id
  )
  select count(*) into deleted_document_count from deleted_docs;

  with deleted_sessions_cte as (
    delete from public.rag_sessions as sessions
    where (
        sessions.hard_expires_at <= p_now
        or sessions.status = 'deleted'
        or sessions.deleted_at is not null
      )
      and not exists (
        select 1
        from public.rag_documents as documents
        where documents.session_id = sessions.id
          and documents.source_kind = 'upload'
      )
    returning id
  )
  select count(*) into deleted_session_count from deleted_sessions_cte;

  return query select deleted_session_count, deleted_document_count;
end;
$$;

revoke execute on function public.delete_expired_rag_rows(timestamptz, text[])
from public, anon, authenticated;

grant execute on function public.delete_expired_rag_rows(timestamptz, text[])
to service_role;
