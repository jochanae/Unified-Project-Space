-- Schedule weekly-summary to run every Sunday at 09:00 UTC
-- Requires vault secrets 'supabase_project_url' and 'supabase_service_role_key'

SELECT cron.schedule(
  'weekly-summary-sunday',
  '0 9 * * 0',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url') || '/functions/v1/weekly-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
