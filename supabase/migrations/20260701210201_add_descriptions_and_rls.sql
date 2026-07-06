-- Add descriptions
ALTER TABLE focus_festival.tents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE focus_festival.cars ADD COLUMN IF NOT EXISTS description TEXT;

-- Enable RLS
ALTER TABLE focus_festival.tents ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_festival.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_festival.applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS tents_select_policy ON focus_festival.tents;
DROP POLICY IF EXISTS tents_insert_policy ON focus_festival.tents;
DROP POLICY IF EXISTS tents_update_policy ON focus_festival.tents;
DROP POLICY IF EXISTS tents_delete_policy ON focus_festival.tents;

DROP POLICY IF EXISTS cars_select_policy ON focus_festival.cars;
DROP POLICY IF EXISTS cars_insert_policy ON focus_festival.cars;
DROP POLICY IF EXISTS cars_update_policy ON focus_festival.cars;
DROP POLICY IF EXISTS cars_delete_policy ON focus_festival.cars;

DROP POLICY IF EXISTS apps_select_policy ON focus_festival.applications;
DROP POLICY IF EXISTS apps_insert_policy ON focus_festival.applications;
DROP POLICY IF EXISTS apps_update_policy ON focus_festival.applications;

-- Tents Policies
CREATE POLICY tents_select_policy ON focus_festival.tents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY tents_insert_policy ON focus_festival.tents FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY tents_update_policy ON focus_festival.tents FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY tents_delete_policy ON focus_festival.tents FOR DELETE USING (auth.uid() = host_id);

-- Cars Policies
CREATE POLICY cars_select_policy ON focus_festival.cars FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY cars_insert_policy ON focus_festival.cars FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY cars_update_policy ON focus_festival.cars FOR UPDATE USING (auth.uid() = driver_id);
CREATE POLICY cars_delete_policy ON focus_festival.cars FOR DELETE USING (auth.uid() = driver_id);

-- Applications Policies
CREATE POLICY apps_select_policy ON focus_festival.applications FOR SELECT USING (
    auth.uid() = applicant_id OR 
    auth.uid() IN (SELECT host_id FROM focus_festival.tents WHERE id = resource_id) OR
    auth.uid() IN (SELECT driver_id FROM focus_festival.cars WHERE id = resource_id)
);
CREATE POLICY apps_insert_policy ON focus_festival.applications FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = applicant_id);
CREATE POLICY apps_update_policy ON focus_festival.applications FOR UPDATE USING (
    auth.uid() IN (SELECT host_id FROM focus_festival.tents WHERE id = resource_id) OR
    auth.uid() IN (SELECT driver_id FROM focus_festival.cars WHERE id = resource_id)
);

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
