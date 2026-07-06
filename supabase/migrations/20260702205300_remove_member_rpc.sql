CREATE OR REPLACE FUNCTION focus_festival.remove_member(app_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = focus_festival, public
AS $$
DECLARE
  v_app focus_festival.applications%ROWTYPE;
  v_is_host BOOLEAN := FALSE;
BEGIN
  -- Get application
  SELECT * INTO v_app FROM focus_festival.applications WHERE id = app_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Verify ownership
  IF v_app.resource_type = 'TENT' THEN
    SELECT TRUE INTO v_is_host FROM focus_festival.tents WHERE id = v_app.resource_id AND host_id = auth.uid();
  ELSIF v_app.resource_type = 'CAR' THEN
    SELECT TRUE INTO v_is_host FROM focus_festival.cars WHERE id = v_app.resource_id AND driver_id = auth.uid();
  END IF;

  IF NOT v_is_host THEN
    RETURN FALSE;
  END IF;

  -- If it was approved, we need to increment spaces
  IF v_app.status = 'APPROVED' THEN
    IF v_app.resource_type = 'TENT' THEN
      UPDATE focus_festival.tents SET remaining_spaces = remaining_spaces + 1 WHERE id = v_app.resource_id;
    ELSIF v_app.resource_type = 'CAR' THEN
      UPDATE focus_festival.cars SET remaining_spaces = remaining_spaces + 1 WHERE id = v_app.resource_id;
    END IF;
  END IF;

  -- Set status to rejected (or delete it, but rejecting keeps history)
  UPDATE focus_festival.applications SET status = 'REJECTED' WHERE id = app_id;
  
  RETURN TRUE;
END;
$$;
