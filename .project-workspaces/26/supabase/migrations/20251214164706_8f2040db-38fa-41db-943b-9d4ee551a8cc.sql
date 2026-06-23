-- Create dedicated extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Move common extensions to the extensions schema
-- Note: We create them in extensions schema (they may already exist in public)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- Drop from public schema if they exist there (after ensuring they exist in extensions)
DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
DROP EXTENSION IF EXISTS "pgcrypto" CASCADE;

-- Recreate in extensions schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- Update search_path to include extensions schema for all roles
ALTER DATABASE postgres SET search_path TO public, extensions;