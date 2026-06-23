-- Recreate pg_net extension outside public schema to satisfy security linter
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    EXECUTE 'DROP EXTENSION pg_net';
  END IF;

  -- Install into the extensions schema
  EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions';
END $$;