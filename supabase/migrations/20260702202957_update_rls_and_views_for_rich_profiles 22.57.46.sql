-- 1. Update RLS Policy for applications
DROP POLICY IF EXISTS applications_select_policy ON focus_festival.applications;
CREATE POLICY applications_select_policy ON focus_festival.applications FOR SELECT USING (
  applicant_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM focus_festival.tents WHERE id = resource_id AND host_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM focus_festival.cars WHERE id = resource_id AND driver_id = auth.uid()
  ) OR
  status = 'APPROVED'
);

-- 2. Update tents_with_host view
CREATE OR REPLACE VIEW focus_festival.tents_with_host WITH (security_invoker = true) AS
SELECT 
  t.*, 
  u.first_name as host_first_name, 
  u.last_name as host_last_name, 
  u.gender as host_gender,
  u.avatar_url as host_avatar_url,
  u.bio as host_bio,
  ch.name as host_church_name,
  sv.name as host_service_name
FROM focus_festival.tents t
LEFT JOIN public.users u ON t.host_id = u.id
LEFT JOIN public.churches ch ON u.church_id = ch.id
LEFT JOIN public.services sv ON u.service_id = sv.id;

-- 3. Update cars_with_driver view
CREATE OR REPLACE VIEW focus_festival.cars_with_driver WITH (security_invoker = true) AS
SELECT 
  c.*, 
  u.first_name as driver_first_name, 
  u.last_name as driver_last_name, 
  u.gender as driver_gender,
  u.avatar_url as driver_avatar_url,
  u.bio as driver_bio,
  ch.name as driver_church_name,
  sv.name as driver_service_name
FROM focus_festival.cars c
LEFT JOIN public.users u ON c.driver_id = u.id
LEFT JOIN public.churches ch ON u.church_id = ch.id
LEFT JOIN public.services sv ON u.service_id = sv.id;

-- 4. Update applications_with_applicant view
CREATE OR REPLACE VIEW focus_festival.applications_with_applicant WITH (security_invoker = true) AS
SELECT 
  a.*, 
  u.first_name as applicant_first_name, 
  u.last_name as applicant_last_name, 
  u.gender as applicant_gender,
  u.avatar_url as applicant_avatar_url,
  u.bio as applicant_bio,
  ch.name as applicant_church_name,
  sv.name as applicant_service_name
FROM focus_festival.applications a
LEFT JOIN public.users u ON a.applicant_id = u.id
LEFT JOIN public.churches ch ON u.church_id = ch.id
LEFT JOIN public.services sv ON u.service_id = sv.id;

NOTIFY pgrst, 'reload schema';
