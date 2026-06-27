create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

create schema if not exists app_private;

revoke all on schema app_private from public, anon, authenticated;

comment on schema app_private is
  'Private operational helpers for RAG Lens. Not exposed to browser roles.';

-- Required Vault secrets before the cron can invoke the Edge Function:
--
-- select vault.create_secret(
--   'https://<project-ref>.supabase.co',
--   'rag_lens_cleanup_project_url',
--   'RAG Lens project API URL for monthly upload cleanup'
-- );
--
-- select vault.create_secret(
--   '<service-role-key>',
--   'rag_lens_cleanup_service_role_key',
--   'Service role token used only by Supabase Cron to invoke cleanup'
-- );

create or replace function app_private.invoke_rag_lens_monthly_cleanup()
returns bigint
language plpgsql
security definer
set search_path = app_private, vault, net, public
as $$
declare
  project_url text;
  service_role_key text;
  request_id bigint;
begin
  select decrypted_secret
    into project_url
  from vault.decrypted_secrets
  where name = 'rag_lens_cleanup_project_url'
  limit 1;

  select decrypted_secret
    into service_role_key
  from vault.decrypted_secrets
  where name = 'rag_lens_cleanup_service_role_key'
  limit 1;

  if project_url is null or btrim(project_url) = '' then
    raise warning 'RAG Lens cleanup skipped because Vault secret rag_lens_cleanup_project_url is missing.';
    return null;
  end if;

  if service_role_key is null or btrim(service_role_key) = '' then
    raise warning 'RAG Lens cleanup skipped because Vault secret rag_lens_cleanup_service_role_key is missing.';
    return null;
  end if;

  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/cleanup-expired-sessions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', service_role_key,
      'Authorization', 'Bearer ' || service_role_key
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
  'Invokes the RAG Lens cleanup Edge Function with credentials stored in Supabase Vault.';

do $$
begin
  perform cron.unschedule('rag-lens-monthly-upload-cleanup');
exception
  when others then
    null;
end;
$$;

select cron.schedule(
  'rag-lens-monthly-upload-cleanup',
  '0 8 1 * *',
  $$select app_private.invoke_rag_lens_monthly_cleanup();$$
);
