-- Schedule flag-missed-plans to run daily at midnight UTC
-- Requires vault secrets 'supabase_project_url' and 'supabase_service_role_key'
-- Create via: select vault.create_secret('https://YOUR_PROJECT.supabase.co', 'supabase_project_url');
--             select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'supabase_service_role_key');

-- Enable pg_cron and pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule daily cron at 0 0 * * * (midnight UTC)
SELECT cron.schedule(
  'flag-missed-plans-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url') || '/functions/v1/flag-missed-plans',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
