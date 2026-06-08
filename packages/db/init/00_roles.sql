-- Docker init script — runs once on first container start before app connects.
-- Creates the mahara_app application role with limited privileges.
-- In production: rotate password, disable superuser fallback.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mahara_app') THEN
    CREATE ROLE mahara_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
      PASSWORD 'mahara_app_dev';
  END IF;
END $$;

GRANT CONNECT ON DATABASE mahara TO mahara_app;
