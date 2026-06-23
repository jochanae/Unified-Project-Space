-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage on the extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Move pg_graphql extension to extensions schema (if it exists in public)
-- Note: Some extensions cannot be moved after creation, in which case we recreate them
DO $$
BEGIN
  -- Check if pg_graphql exists in public schema
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'pg_graphql' AND n.nspname = 'public'
  ) THEN
    -- Drop and recreate in extensions schema
    DROP EXTENSION IF EXISTS pg_graphql;
    CREATE EXTENSION IF NOT EXISTS pg_graphql SCHEMA extensions;
  END IF;
END $$;