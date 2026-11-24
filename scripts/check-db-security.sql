-- Verify all non-extension tables in public/focus_festival have RLS enabled
-- and all non-extension views set security_invoker = true.
DO $$
DECLARE
  unprotected_tables text;
  unprotected_views text;
BEGIN
  SELECT string_agg(format('%I.%I', n.nspname, c.relname), ', ' ORDER BY n.nspname, c.relname)
  INTO unprotected_tables
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'focus_festival')
    AND c.relkind IN ('r', 'p')
    AND NOT c.relrowsecurity
    AND NOT EXISTS (
      SELECT 1
      FROM pg_depend d
      WHERE d.objid = c.oid
        AND d.deptype = 'e'
    );

  IF unprotected_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Tables missing Row Level Security (ENABLE ROW LEVEL SECURITY): %', unprotected_tables;
  END IF;

  SELECT string_agg(format('%I.%I', n.nspname, c.relname), ', ' ORDER BY n.nspname, c.relname)
  INTO unprotected_views
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'focus_festival')
    AND c.relkind = 'v'
    AND NOT (coalesce(c.reloptions, ARRAY[]::text[]) @> ARRAY['security_invoker=true'])
    AND NOT EXISTS (
      SELECT 1
      FROM pg_depend d
      WHERE d.objid = c.oid
        AND d.deptype = 'e'
    );

  IF unprotected_views IS NOT NULL THEN
    RAISE EXCEPTION 'Views missing security_invoker=true: %', unprotected_views;
  END IF;

  RAISE NOTICE 'DB security check passed: all tables in public/focus_festival have RLS enabled and all views set security_invoker=true.';
END
$$;
