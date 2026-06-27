create or replace function public.create_upload_document(
  p_document_id uuid,
  p_session_id uuid,
  p_file_name text,
  p_mime_type text,
  p_byte_size integer,
  p_storage_path text,
  p_extracted_text text,
  p_now timestamptz default now()
)
returns table (
  id uuid,
  expires_at timestamptz,
  hard_expires_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  session_row public.rag_sessions%rowtype;
  existing_file_count integer;
  existing_byte_count bigint;
begin
  select *
  into session_row
  from public.rag_sessions
  where rag_sessions.id = p_session_id
    and rag_sessions.status = 'active'
    and rag_sessions.expires_at > p_now
  for update;

  if not found then
    raise exception 'Session not found or expired';
  end if;

  select
    count(*)::integer,
    coalesce(sum(rag_documents.byte_size), 0)::bigint
  into existing_file_count, existing_byte_count
  from public.rag_documents
  where rag_documents.session_id = p_session_id
    and rag_documents.source_kind = 'upload';

  if existing_file_count >= 3 then
    raise exception 'Anonymous sessions are limited to 3 files.';
  end if;

  if existing_byte_count + p_byte_size > 10485760 then
    raise exception 'Anonymous sessions are limited to 10 MB total.';
  end if;

  return query
  with inserted as (
    insert into public.rag_documents (
      id,
      session_id,
      corpus_slug,
      source_kind,
      file_name,
      mime_type,
      byte_size,
      storage_path,
      status,
      extraction_error,
      extracted_text,
      expires_at,
      hard_expires_at
    ) values (
      p_document_id,
      p_session_id,
      null,
      'upload',
      p_file_name,
      p_mime_type,
      p_byte_size,
      p_storage_path,
      'ready',
      null,
      p_extracted_text,
      session_row.expires_at,
      session_row.hard_expires_at
    )
    returning
      rag_documents.id as document_id,
      rag_documents.expires_at as document_expires_at,
      rag_documents.hard_expires_at as document_hard_expires_at
  )
  select
    inserted.document_id,
    inserted.document_expires_at,
    inserted.document_hard_expires_at
  from inserted;
end;
$$;

revoke execute on function public.create_upload_document(
  uuid,
  uuid,
  text,
  text,
  integer,
  text,
  text,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.create_upload_document(
  uuid,
  uuid,
  text,
  text,
  integer,
  text,
  text,
  timestamptz
) to service_role;
