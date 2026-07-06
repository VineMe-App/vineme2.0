GRANT USAGE ON SCHEMA focus_festival TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA focus_festival TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA focus_festival TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA focus_festival TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA focus_festival GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA focus_festival GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA focus_festival GRANT ALL ON ROUTINES TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
