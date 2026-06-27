-- Cron invokes the cleanup Edge Function with a dedicated bearer token instead
-- of the Supabase service-role key. Store this value in both Supabase Vault
-- (`rag_lens_cleanup_token`) and Edge Function secrets
-- (`RAG_LENS_CLEANUP_TOKEN`).

create or replace function app_private.invoke_rag_lens_monthly_cleanup()
returns bigint
language plpgsql
security definer
set search_path = app_private, vault, net, public
as $$
declare
  cleanup_token text;
  project_url text;
  request_id bigint;
begin
  select decrypted_secret
    into project_url
  from vault.decrypted_secrets
  where name = 'rag_lens_cleanup_project_url'
  limit 1;

  select decrypted_secret
    into cleanup_token
  from vault.decrypted_secrets
  where name = 'rag_lens_cleanup_token'
  limit 1;

  if project_url is null or btrim(project_url) = '' then
    raise warning 'RAG Lens cleanup skipped because Vault secret rag_lens_cleanup_project_url is missing.';
    return null;
  end if;

  if cleanup_token is null or btrim(cleanup_token) = '' then
    raise warning 'RAG Lens cleanup skipped because Vault secret rag_lens_cleanup_token is missing.';
    return null;
  end if;

  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/cleanup-expired-sessions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cleanup_token
    ),
    body := jsonb_build_object(
      'source', 'supabase-cron',
      'job', 'rag-lens-monthly-upload-cleanup',
      'scheduled_at', now()
    ),
    timeout_milliseconds := 10000
  ) into request_id;

  return request_id;
end;
$$;

revoke execute on function app_private.invoke_rag_lens_monthly_cleanup()
from public, anon, authenticated;

comment on function app_private.invoke_rag_lens_monthly_cleanup() is
  'Invokes the RAG Lens cleanup Edge Function with a dedicated cleanup token stored in Supabase Vault.';
