CREATE OR REPLACE VIEW focus_festival.tents_with_host WITH (security_invoker = true) AS
SELECT 
  t.*, 
  u.first_name as host_first_name, 
  u.last_name as host_last_name, 
  u.gender as host_gender
FROM focus_festival.tents t
LEFT JOIN public.users u ON t.host_id = u.id;

CREATE OR REPLACE VIEW focus_festival.cars_with_driver WITH (security_invoker = true) AS
SELECT 
  c.*, 
  u.first_name as driver_first_name, 
  u.last_name as driver_last_name, 
  u.gender as driver_gender
FROM focus_festival.cars c
LEFT JOIN public.users u ON c.driver_id = u.id;

CREATE OR REPLACE VIEW focus_festival.applications_with_applicant WITH (security_invoker = true) AS
SELECT 
  a.*, 
  u.first_name as applicant_first_name, 
  u.last_name as applicant_last_name, 
  u.gender as applicant_gender
FROM focus_festival.applications a
LEFT JOIN public.users u ON a.applicant_id = u.id;

NOTIFY pgrst, 'reload schema';
