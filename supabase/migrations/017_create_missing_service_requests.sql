-- Populate requester name/email from users and auth.users when requester_id is available

-- Populate requester name/email from users and auth.users when requester_id is available
CREATE OR REPLACE FUNCTION public.set_new_church_requester_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  fetched_name text;
  fetched_email text;
BEGIN
  IF NEW.requester_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    NULLIF(TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))), '')
  INTO fetched_name
  FROM public.users
  WHERE id = NEW.requester_id;

  BEGIN
    SELECT email INTO fetched_email
    FROM auth.users
    WHERE id = NEW.requester_id;
  EXCEPTION
    WHEN OTHERS THEN
      fetched_email := NULL;
  END;

  NEW.requester_name := COALESCE(fetched_name, NEW.requester_name);
  NEW.requester_email := COALESCE(fetched_email, NEW.requester_email);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_new_church_requester_fields
ON public.new_church_requests;

CREATE TRIGGER trg_set_new_church_requester_fields
BEFORE INSERT ON public.new_church_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_new_church_requester_fields();
