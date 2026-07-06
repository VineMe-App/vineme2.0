-- 1. Withdraw Application RPC
CREATE OR REPLACE FUNCTION focus_festival.withdraw_application(app_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = focus_festival, public
AS $$
DECLARE
  v_app focus_festival.applications%ROWTYPE;
BEGIN
  -- Get application
  SELECT * INTO v_app FROM focus_festival.applications WHERE id = app_id AND applicant_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- If approved, we need to increment spaces
  IF v_app.status = 'APPROVED' THEN
    IF v_app.resource_type = 'TENT' THEN
      UPDATE focus_festival.tents SET remaining_spaces = remaining_spaces + 1 WHERE id = v_app.resource_id;
    ELSIF v_app.resource_type = 'CAR' THEN
      UPDATE focus_festival.cars SET remaining_spaces = remaining_spaces + 1 WHERE id = v_app.resource_id;
    END IF;
  END IF;

  -- Delete the application
  DELETE FROM focus_festival.applications WHERE id = app_id;
  
  RETURN TRUE;
END;
$$;

-- 2. Delete Resource RPC
CREATE OR REPLACE FUNCTION focus_festival.delete_resource(res_id UUID, res_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = focus_festival, public
AS $$
DECLARE
  v_found BOOLEAN := FALSE;
BEGIN
  -- Verify ownership and resource type
  IF res_type = 'TENT' THEN
    SELECT TRUE INTO v_found FROM focus_festival.tents WHERE id = res_id AND host_id = auth.uid();
    IF v_found THEN
      DELETE FROM focus_festival.applications WHERE resource_id = res_id;
      DELETE FROM focus_festival.tents WHERE id = res_id;
      RETURN TRUE;
    END IF;
  ELSIF res_type = 'CAR' THEN
    SELECT TRUE INTO v_found FROM focus_festival.cars WHERE id = res_id AND driver_id = auth.uid();
    IF v_found THEN
      DELETE FROM focus_festival.applications WHERE resource_id = res_id;
      DELETE FROM focus_festival.cars WHERE id = res_id;
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$;

