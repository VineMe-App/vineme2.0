

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."app_create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb" DEFAULT '{}'::"jsonb", "p_action_url" "text" DEFAULT NULL::"text", "p_expires_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_row notifications;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  INSERT INTO notifications (
    user_id, type, title, body, data, action_url, expires_at, read, created_at, updated_at
  ) VALUES (
    p_user_id, p_type, p_title, p_body, COALESCE(p_data, '{}'::jsonb), p_action_url, p_expires_at, FALSE, NOW(), NOW()
  ) RETURNING * INTO new_row;

  -- Return JSON instead of table row
  RETURN json_build_object(
    'id', new_row.id,
    'user_id', new_row.user_id,
    'type', new_row.type,
    'title', new_row.title,
    'body', new_row.body,
    'data', new_row.data,
    'action_url', new_row.action_url,
    'expires_at', new_row.expires_at,
    'read', new_row.read,
    'created_at', new_row.created_at,
    'updated_at', new_row.updated_at
  );
END;
$$;


ALTER FUNCTION "public"."app_create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb", "p_action_url" "text", "p_expires_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_group"("p_group_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  creator_id uuid;
begin
  if not public.fn_current_user_has_role('church_admin') then
    raise exception 'Only church_admin can approve groups';
  end if;

  select created_by into creator_id
  from public.groups
  where id = p_group_id;

  if creator_id is null then
    raise exception 'Group not found or created_by is null';
  end if;

  -- Update group status to approved (with updated_at)
  update public.groups
     set status = 'approved',
         updated_at = now()
   where id = p_group_id;

  if not found then
    raise exception 'Group not found';
  end if;

  -- Activate creator's leadership
  insert into public.group_memberships (group_id, user_id, role, status, joined_at, journey_status)
  values (p_group_id, creator_id, 'leader', 'active', now(), 3)
  on conflict (group_id, user_id) do update
    set role = 'leader',
        status = 'active',
        joined_at = coalesce(public.group_memberships.joined_at, now()),
        journey_status = 3;
end;
$$;


ALTER FUNCTION "public"."approve_group"("p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_group_atomic"("p_group_id" "uuid", "p_admin_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_id uuid;
  v_caller_roles text[];
  v_caller_church_id uuid;
  v_group_status text;
  v_group_church_id uuid;
  v_created_by uuid;
  v_leader_membership_id uuid;
  v_leader_membership_status text;
  v_result jsonb;
BEGIN
  -- Ensure caller is authenticated
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Verify the caller ID matches the admin ID (prevent impersonation)
  IF v_caller_id != p_admin_id THEN
    RAISE EXCEPTION 'Caller ID does not match admin ID' USING ERRCODE = '42501';
  END IF;

  -- Get caller's roles and church_id to verify permissions
  SELECT roles, church_id
  INTO v_caller_roles, v_caller_church_id
  FROM users
  WHERE id = v_caller_id;

  IF v_caller_roles IS NULL THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0001';
  END IF;

  -- Check if caller has church_admin or superadmin role
  IF NOT (
    'church_admin' = ANY(v_caller_roles) OR
    'superadmin' = ANY(v_caller_roles)
  ) THEN
    RAISE EXCEPTION 'Church admin role required for this action' USING ERRCODE = '42501';
  END IF;

  -- Verify the group exists and is pending
  SELECT status, created_by, church_id
  INTO v_group_status, v_created_by, v_group_church_id
  FROM groups
  WHERE id = p_group_id;

  IF v_group_status IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  IF v_group_status != 'pending' THEN
    RAISE EXCEPTION 'Group is not pending approval';
  END IF;

  -- Verify caller can access this church's data
  -- Superadmins can access any church, church admins can only access their own church
  IF NOT (
    'superadmin' = ANY(v_caller_roles) OR
    (v_caller_church_id IS NOT NULL AND v_caller_church_id = v_group_church_id)
  ) THEN
    RAISE EXCEPTION 'Access denied to church data' USING ERRCODE = '42501';
  END IF;

  -- Check for existing leader membership
  IF v_created_by IS NOT NULL THEN
    SELECT id, status
    INTO v_leader_membership_id, v_leader_membership_status
    FROM group_memberships
    WHERE group_id = p_group_id
      AND user_id = v_created_by
      AND role = 'leader'
    LIMIT 1;

    -- Create or activate leader membership
    IF v_leader_membership_id IS NULL THEN
      -- Create new leader membership
      INSERT INTO group_memberships (
        group_id,
        user_id,
        role,
        status,
        joined_at
      ) VALUES (
        p_group_id,
        v_created_by,
        'leader',
        'active',
        NOW()
      ) RETURNING id INTO v_leader_membership_id;
    ELSIF v_leader_membership_status != 'active' THEN
      -- Activate existing membership
      UPDATE group_memberships
      SET status = 'active',
          joined_at = COALESCE(joined_at, NOW())
      WHERE id = v_leader_membership_id;
    END IF;
  END IF;

  -- Update group status to approved (only after membership is ensured)
  UPDATE groups
  SET status = 'approved',
      updated_at = NOW()
  WHERE id = p_group_id;

  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'group_id', p_group_id,
    'leader_membership_id', v_leader_membership_id
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback is automatic in PostgreSQL transactions
    -- Return error details
    RAISE EXCEPTION 'Failed to approve group: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."approve_group_atomic"("p_group_id" "uuid", "p_admin_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_notification_settings"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO user_notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_notification_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_church_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select church_id from public.users where id = auth.uid();
$$;


ALTER FUNCTION "public"."current_user_church_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_has_role"("role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce((select roles @> array[role] from public.users where id = auth.uid()), false);
$$;


ALTER FUNCTION "public"."current_user_has_role"("role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_service_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select service_id from public.users where id = auth.uid();
$$;


ALTER FUNCTION "public"."current_user_service_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decline_group_atomic"("p_group_id" "uuid", "p_admin_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_id uuid;
  v_caller_roles text[];
  v_caller_church_id uuid;
  v_group_status text;
  v_group_church_id uuid;
  v_created_by uuid;
  v_leader_membership_id uuid;
  v_result jsonb;
BEGIN
  -- Ensure caller is authenticated
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Verify the caller ID matches the admin ID (prevent impersonation)
  IF v_caller_id != p_admin_id THEN
    RAISE EXCEPTION 'Caller ID does not match admin ID' USING ERRCODE = '42501';
  END IF;

  -- Get caller's roles and church_id to verify permissions
  SELECT roles, church_id
  INTO v_caller_roles, v_caller_church_id
  FROM users
  WHERE id = v_caller_id;

  IF v_caller_roles IS NULL THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0001';
  END IF;

  -- Check if caller has church_admin or superadmin role
  IF NOT (
    'church_admin' = ANY(v_caller_roles) OR
    'superadmin' = ANY(v_caller_roles)
  ) THEN
    RAISE EXCEPTION 'Church admin role required for this action' USING ERRCODE = '42501';
  END IF;

  -- Verify the group exists and is pending
  SELECT status, created_by, church_id
  INTO v_group_status, v_created_by, v_group_church_id
  FROM groups
  WHERE id = p_group_id;

  IF v_group_status IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  IF v_group_status != 'pending' THEN
    RAISE EXCEPTION 'Group is not pending approval';
  END IF;

  -- Verify caller can access this church's data
  -- Superadmins can access any church, church admins can only access their own church
  IF NOT (
    'superadmin' = ANY(v_caller_roles) OR
    (v_caller_church_id IS NOT NULL AND v_caller_church_id = v_group_church_id)
  ) THEN
    RAISE EXCEPTION 'Access denied to church data' USING ERRCODE = '42501';
  END IF;

  -- Deactivate or remove the creator's leader membership
  IF v_created_by IS NOT NULL THEN
    -- Find the leader membership
    SELECT id
    INTO v_leader_membership_id
    FROM group_memberships
    WHERE group_id = p_group_id
      AND user_id = v_created_by
      AND role = 'leader'
    LIMIT 1;

    -- If membership exists, delete it (cleaner than deactivating)
    -- This removes the stale membership entirely
    IF v_leader_membership_id IS NOT NULL THEN
      DELETE FROM group_memberships
      WHERE id = v_leader_membership_id;
    END IF;
  END IF;

  -- Update group status to declined (only after membership is cleaned up)
  UPDATE groups
  SET status = 'declined',
      updated_at = NOW()
  WHERE id = p_group_id;

  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'group_id', p_group_id,
    'membership_removed', v_leader_membership_id IS NOT NULL
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback is automatic in PostgreSQL transactions
    -- Return error details
    RAISE EXCEPTION 'Failed to decline group: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."decline_group_atomic"("p_group_id" "uuid", "p_admin_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_my_account"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_sole_leader_groups text[];
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check for sole leadership with a more robust query
  SELECT COALESCE(array_agg(g.title), ARRAY[]::text[])
  INTO v_sole_leader_groups
  FROM public.groups g
  WHERE g.id IN (
    SELECT gm1.group_id
    FROM public.group_memberships gm1
    WHERE gm1.user_id = v_user_id
      AND gm1.role = 'leader'
      AND gm1.status = 'active'
      AND g.status = 'approved'
    AND NOT EXISTS (
      SELECT 1
      FROM public.group_memberships gm2
      WHERE gm2.group_id = gm1.group_id
        AND gm2.user_id != v_user_id
        AND gm2.role IN ('leader', 'admin')
        AND gm2.status = 'active'
    )
  );

  -- Check if user is sole leader of any groups
  IF array_length(v_sole_leader_groups, 1) > 0 THEN
    RAISE EXCEPTION 'SOLE_LEADER: You are the sole leader of the following group(s): %. Please assign a new leader or close the group before deleting your account.',
      array_to_string(v_sole_leader_groups, ', ');
  END IF;

  -- Delete user data from existing tables with correct column names
  DELETE FROM public.group_memberships WHERE user_id = v_user_id;
  DELETE FROM public.friendships WHERE user_id = v_user_id OR friend_id = v_user_id;
  DELETE FROM public.referrals WHERE referred_by_user_id = v_user_id OR referred_user_id = v_user_id;
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  DELETE FROM public.user_notification_settings WHERE user_id = v_user_id;
  DELETE FROM public.user_push_tokens WHERE user_id = v_user_id;

  -- Finally, delete the user record
  DELETE FROM public.users WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Account deleted successfully',
    'deleted_user_id', v_user_id
  );
END;
$$;


ALTER FUNCTION "public"."delete_my_account"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_my_account"() IS 'Allows an authenticated user to delete their own account and all associated data.
Prevents deletion if the user is the sole leader of any active groups.';



CREATE OR REPLACE FUNCTION "public"."deny_group"("p_group_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  creator_id uuid;
begin
  if not public.fn_current_user_has_role('church_admin') then
    raise exception 'Only church_admin can deny groups';
  end if;

  -- Update group status to denied (with updated_at)
  update public.groups
     set status = 'denied',
         updated_at = now()
   where id = p_group_id;

  select created_by into creator_id from public.groups where id = p_group_id;

  -- Deactivate creator's membership
  update public.group_memberships
     set status = 'inactive'
   where group_id = p_group_id
     and user_id = creator_id;
end;
$$;


ALTER FUNCTION "public"."deny_group"("p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_auth_user_id_by_phone"("p_phone" "text") RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with input as (
    select regexp_replace(p_phone, '\D', '', 'g') as digits
  )
  select u.id
  from auth.users u
  cross join input
  where
    -- exact digits match
    regexp_replace(u.phone, '\D', '', 'g') = input.digits
    -- UK fix: treat 4407... as 447...
    or regexp_replace(u.phone, '\D', '', 'g')
       = regexp_replace(input.digits, '^440', '44')
  limit 1;
$$;


ALTER FUNCTION "public"."find_auth_user_id_by_phone"("p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_add_creator_as_pending_leader"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- Insert creator as active leader (not pending)
  INSERT INTO public.group_memberships
    (group_id, user_id, role, status, joined_at, journey_status, referral_id)
  VALUES
    (NEW.id, NEW.created_by, 'leader', 'active', NOW(), 3, NULL)
  ON CONFLICT (group_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        status = EXCLUDED.status,
        joined_at = EXCLUDED.joined_at,
        journey_status = EXCLUDED.journey_status;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_add_creator_as_pending_leader"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_current_user_has_role"("p_role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and p_role = any(u.roles)
  );
$$;


ALTER FUNCTION "public"."fn_current_user_has_role"("p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_set_group_created_by_default"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."fn_set_group_created_by_default"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_context"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_uid uuid;
  v_user_service_id uuid;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RETURN json_build_object(
      'uid', null,
      'user_service_id', null
    );
  END IF;

  -- Get the user's service_id
  SELECT service_id INTO v_user_service_id
  FROM public.users
  WHERE id = v_uid;

  -- Return JSON object
  RETURN json_build_object(
    'uid', v_uid,
    'user_service_id', v_user_service_id
  );
END;
$$;


ALTER FUNCTION "public"."get_auth_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_contact"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  result jsonb;
begin
  result := (
    select jsonb_build_object(
      'user_id', u.id,
      'phone', coalesce(u.phone, (u.raw_user_meta_data->>'phone')),
      'phone_verified', u.phone is not null
    )
    from auth.users u
    where u.id = auth.uid()
  );
  return result;
end;
$$;


ALTER FUNCTION "public"."get_my_contact"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_contact_admin"("target_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  result jsonb;
  user_name text;
  user_phone text;
  user_email text;
BEGIN
  -- Ensure caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Ensure caller is authorised: either a church admin for the user's church,
  -- a leader/admin for a group the user belongs to (pending or active),
  -- or the user themselves.
  IF NOT (
    target_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.users target
      JOIN public.users caller ON caller.id = auth.uid()
      WHERE target.id = target_user_id
        AND caller.church_id IS NOT NULL
        AND caller.church_id = target.church_id
        AND caller.roles @> ARRAY['church_admin']::text[]
    )
    OR EXISTS (
      SELECT 1
      FROM public.group_memberships leader_membership
      WHERE leader_membership.user_id = auth.uid()
        AND leader_membership.status = 'active'
        AND leader_membership.role IN ('leader', 'admin')
        AND EXISTS (
          SELECT 1
          FROM public.group_memberships target_membership
          WHERE target_membership.group_id = leader_membership.group_id
            AND target_membership.user_id = target_user_id
            AND target_membership.status IN ('active', 'pending')
        )
    )
  ) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  -- Get name from public.users
  SELECT
    COALESCE(
      TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))),
      ''
    ) AS name
  INTO user_name
  FROM public.users
  WHERE id = target_user_id;

  IF user_name IS NULL THEN
    user_name := '';
  END IF;

  -- Attempt to get email/phone from auth.users
  BEGIN
    SELECT email, phone INTO user_email, user_phone
    FROM auth.users
    WHERE id = target_user_id;
  EXCEPTION
    WHEN OTHERS THEN
      user_email := NULL;
      user_phone := NULL;
  END;

  -- Build result object
  result := jsonb_build_object(
    'name', user_name,
    'email', user_email,
    'phone', user_phone
  );

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_user_contact_admin"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_church_admin_for_group"("gid" "uuid", "uid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users u
    JOIN services s ON s.id = (
      SELECT service_id FROM groups g WHERE g.id = gid
    )
    WHERE u.id = uid
      AND u.roles @> ARRAY['church_admin']::text[]
      AND u.church_id = s.church_id
  );
END;
$$;


ALTER FUNCTION "public"."is_church_admin_for_group"("gid" "uuid", "uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_group_leader"("gid" "uuid", "uid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_memberships gm
    WHERE gm.group_id = gid
      AND gm.user_id = uid
      AND gm.status = 'active'
      AND gm.role = 'leader'
  );
END;
$$;


ALTER FUNCTION "public"."is_group_leader"("gid" "uuid", "uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_member_of_group"("target_group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.group_memberships
    where group_id = target_group_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;


ALTER FUNCTION "public"."is_member_of_group"("target_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_group"("p_title" "text", "p_description" "text", "p_meeting_day" "text", "p_location" "jsonb", "p_meeting_time" time without time zone, "p_service_id" "uuid", "p_church_id" "uuid" DEFAULT NULL::"uuid", "p_whatsapp_link" "text" DEFAULT NULL::"text", "p_image_url" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  gid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.groups (
    title, description, meeting_day, location,
    whatsapp_link, image_url, service_id, meeting_time,
    status, church_id, created_by
  )
  values (
    p_title, p_description, p_meeting_day, p_location,
    p_whatsapp_link, p_image_url, p_service_id, p_meeting_time,
    'pending', p_church_id, auth.uid()
  )
  returning id into gid;

  return gid;
end;
$$;


ALTER FUNCTION "public"."request_group"("p_title" "text", "p_description" "text", "p_meeting_day" "text", "p_location" "jsonb", "p_meeting_time" time without time zone, "p_service_id" "uuid", "p_church_id" "uuid", "p_whatsapp_link" "text", "p_image_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_group_service_id_from_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- Overwrite service_id with the current user's service_id
  select u.service_id into new.service_id from public.users u where u.id = auth.uid();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_group_service_id_from_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_new_church_requester_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
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


ALTER FUNCTION "public"."set_new_church_requester_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end; $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_group_service_church"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.service_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.church_id IS NULL THEN
    RAISE EXCEPTION 'groups.church_id must be set when service_id is provided';
  END IF;
  PERFORM 1 FROM public.services s WHERE s.id = NEW.service_id AND s.church_id = NEW.church_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service % does not belong to church %', NEW.service_id, NEW.church_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_group_service_church"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    "color" "text",
    "icon" "text"
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."churches" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "location" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "address" "text",
    "phone" "text",
    "email" "text"
);


ALTER TABLE "public"."churches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "church_id" "uuid",
    "host_id" "uuid" NOT NULL,
    "category" "uuid" NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone,
    "is_recurring" boolean DEFAULT false NOT NULL,
    "recurrence_pattern" "text",
    "requires_ticket" boolean DEFAULT false NOT NULL,
    "multi_day" boolean DEFAULT false NOT NULL,
    "location" "jsonb" NOT NULL,
    "is_public" boolean DEFAULT true NOT NULL,
    "image_url" "text",
    "price" numeric(10,2),
    "whatsapp_link" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."friendships" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friend_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "friendships_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."friendships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_membership_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_by_user_id" "uuid" NOT NULL,
    "note_type" character varying(50) NOT NULL,
    "note_text" "text",
    "previous_status" character varying(20),
    "new_status" character varying(20),
    "previous_journey_status" integer,
    "new_journey_status" integer,
    "previous_role" character varying(20),
    "new_role" character varying(20),
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "group_membership_notes_new_journey_status_check" CHECK (("new_journey_status" = ANY (ARRAY[1, 2, 3]))),
    CONSTRAINT "group_membership_notes_new_role_check" CHECK ((("new_role")::"text" = ANY ((ARRAY['member'::character varying, 'leader'::character varying, 'admin'::character varying])::"text"[]))),
    CONSTRAINT "group_membership_notes_new_status_check" CHECK ((("new_status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'pending'::character varying, 'archived'::character varying])::"text"[]))),
    CONSTRAINT "group_membership_notes_note_type_check" CHECK ((("note_type")::"text" = ANY ((ARRAY['manual'::character varying, 'request_approved'::character varying, 'request_archived'::character varying, 'member_left'::character varying, 'journey_status_change'::character varying, 'role_change'::character varying])::"text"[]))),
    CONSTRAINT "group_membership_notes_previous_journey_status_check" CHECK (("previous_journey_status" = ANY (ARRAY[1, 2, 3]))),
    CONSTRAINT "group_membership_notes_previous_role_check" CHECK ((("previous_role")::"text" = ANY ((ARRAY['member'::character varying, 'leader'::character varying, 'admin'::character varying])::"text"[]))),
    CONSTRAINT "group_membership_notes_previous_status_check" CHECK ((("previous_status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'pending'::character varying, 'archived'::character varying])::"text"[]))),
    CONSTRAINT "valid_manual_note" CHECK ((((("note_type")::"text" = 'manual'::"text") AND ("note_text" IS NOT NULL)) OR (("note_type")::"text" <> 'manual'::"text")))
);


ALTER TABLE "public"."group_membership_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_memberships" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "joined_at" timestamp with time zone,
    "referral_id" "uuid",
    "journey_status" smallint,
    CONSTRAINT "group_memberships_active_requires_attended" CHECK ((("status" <> 'active'::"text") OR ("journey_status" = 3))),
    CONSTRAINT "group_memberships_joined_at_consistency" CHECK (((("status" = 'pending'::"text") AND ("joined_at" IS NULL)) OR ("status" <> 'pending'::"text"))),
    CONSTRAINT "group_memberships_journey_status_check" CHECK ((("journey_status" IS NULL) OR ("journey_status" = ANY (ARRAY[1, 2, 3])))),
    CONSTRAINT "group_memberships_role_check" CHECK (("role" = ANY (ARRAY['member'::"text", 'leader'::"text", 'admin'::"text"]))),
    CONSTRAINT "group_memberships_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'inactive'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."group_memberships" OWNER TO "postgres";


COMMENT ON COLUMN "public"."group_memberships"."role" IS '''member'' or ''leader''';



COMMENT ON COLUMN "public"."group_memberships"."status" IS 'Membership status: pending (request submitted), active (approved and joined), inactive (left or removed after joining), archived (request declined before joining)';



CREATE TABLE IF NOT EXISTS "public"."group_memberships_temp" (
    "id" character varying NOT NULL,
    "group_id" character varying,
    "user_id" character varying,
    "role" "text",
    "created_at" timestamp with time zone,
    "status" "text",
    "joined_at" timestamp with time zone,
    "referral_id" "text",
    "journey_status" bigint
);


ALTER TABLE "public"."group_memberships_temp" OWNER TO "postgres";


COMMENT ON TABLE "public"."group_memberships_temp" IS 'Using to update group_memberships table with status and journey_status and joined_at';



CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "meeting_day" "text" NOT NULL,
    "location" "jsonb" NOT NULL,
    "whatsapp_link" "text",
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "service_id" "uuid" NOT NULL,
    "meeting_time" time without time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "church_id" "uuid",
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "at_capacity" boolean DEFAULT false NOT NULL,
    CONSTRAINT "groups_meeting_day_check" CHECK (("meeting_day" = ANY (ARRAY['Sunday'::"text", 'Monday'::"text", 'Tuesday'::"text", 'Wednesday'::"text", 'Thursday'::"text", 'Friday'::"text", 'Saturday'::"text"]))),
    CONSTRAINT "groups_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'denied'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


COMMENT ON COLUMN "public"."groups"."at_capacity" IS 'Indicates if the group is currently at capacity. Users can still apply but will see a warning.';



CREATE TABLE IF NOT EXISTS "public"."new_church_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "church_id" "uuid",
    "church_name" "text" NOT NULL,
    "church_location" "text",
    "service_name" "text",
    "service_time" "text",
    "additional_info" "text",
    "contact_name" "text" NOT NULL,
    "contact_email" "text",
    "requester_name" "text",
    "requester_id" "uuid",
    "requester_email" "text"
);


ALTER TABLE "public"."new_church_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "read" boolean DEFAULT false NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "action_url" "text",
    "expires_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['friend_request_received'::"text", 'friend_request_accepted'::"text", 'group_request_submitted'::"text", 'group_request_approved'::"text", 'group_request_denied'::"text", 'join_request_received'::"text", 'join_request_approved'::"text", 'join_request_denied'::"text", 'group_member_added'::"text", 'referral_received'::"text", 'referral_accepted'::"text", 'referral_joined_group'::"text", 'event_reminder'::"text", 'friend_request'::"text", 'group_update'::"text", 'group_request'::"text", 'join_request'::"text", 'cannot_find_group_reported'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON COLUMN "public"."notifications"."action_url" IS 'Deep link URL for navigation when notification is tapped';



COMMENT ON COLUMN "public"."notifications"."expires_at" IS 'Optional expiration time for time-sensitive notifications';



CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "referred_by_user_id" "uuid" NOT NULL,
    "church_id" "uuid" NOT NULL,
    "group_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "note" "text",
    "referred_user_id" "uuid",
    CONSTRAINT "group_referrals_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."referrals" OWNER TO "postgres";


COMMENT ON COLUMN "public"."referrals"."note" IS 'A note so that the group leader has some context';



CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "church_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "day_of_week" "text" NOT NULL,
    "start_time" "text" NOT NULL,
    "location" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_day_of_week" CHECK (("day_of_week" = ANY (ARRAY['Sunday'::"text", 'Monday'::"text", 'Tuesday'::"text", 'Wednesday'::"text", 'Thursday'::"text", 'Friday'::"text", 'Saturday'::"text"])))
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "qr_code" "text" NOT NULL,
    "checked_in" boolean DEFAULT false NOT NULL,
    "payment_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tickets_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notification_settings" (
    "user_id" "uuid" NOT NULL,
    "friend_requests" boolean DEFAULT true NOT NULL,
    "event_reminders" boolean DEFAULT true NOT NULL,
    "group_updates" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "friend_request_accepted" boolean DEFAULT true,
    "group_requests" boolean DEFAULT true,
    "group_request_responses" boolean DEFAULT true,
    "join_requests" boolean DEFAULT true,
    "join_request_responses" boolean DEFAULT true,
    "referral_updates" boolean DEFAULT true,
    "push_notifications" boolean DEFAULT true,
    "email_notifications" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_notification_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_push_tokens" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "push_token" "text" NOT NULL,
    "platform" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_push_tokens_platform_check" CHECK (("platform" = ANY (ARRAY['ios'::"text", 'android'::"text", 'web'::"text"])))
);


ALTER TABLE "public"."user_push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "roles" "text"[] DEFAULT ARRAY['user'::"text"] NOT NULL,
    "church_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar_url" "text",
    "service_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "newcomer" boolean DEFAULT false NOT NULL,
    "onboarding_complete" boolean DEFAULT false NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "name" "text" GENERATED ALWAYS AS ("btrim"(((COALESCE("first_name", ''::"text") ||
CASE
    WHEN ((COALESCE("first_name", ''::"text") <> ''::"text") AND (COALESCE("last_name", ''::"text") <> ''::"text")) THEN ' '::"text"
    ELSE ''::"text"
END) || COALESCE("last_name", ''::"text")))) STORED,
    "bio" "text",
    "marketing_opt_in" boolean DEFAULT false,
    "cannot_find_group" boolean DEFAULT false,
    "cannot_find_group_requested_at" timestamp with time zone,
    "cannot_find_group_contacted_at" timestamp with time zone,
    "cannot_find_group_resolved_at" timestamp with time zone,
    CONSTRAINT "users_check" CHECK (("roles" <@ ARRAY['user'::"text", 'church_admin'::"text", 'superadmin'::"text"])),
    CONSTRAINT "users_newcomer_check" CHECK (("newcomer" = ANY (ARRAY[true, false])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."newcomer" IS 'Is the user new to the church or not (are they looking for a group or do they already have one)';



COMMENT ON COLUMN "public"."users"."bio" IS 'User biography or description text';



COMMENT ON COLUMN "public"."users"."marketing_opt_in" IS 'User opt-in preference for marketing emails and newsletters';



COMMENT ON COLUMN "public"."users"."cannot_find_group" IS 'Flag indicating that the user cannot find a suitable group and needs help from the connections team';



COMMENT ON COLUMN "public"."users"."cannot_find_group_requested_at" IS 'Timestamp when user first flagged that no group fits their needs';



COMMENT ON COLUMN "public"."users"."cannot_find_group_contacted_at" IS 'Timestamp when church admin contacted the user about their group needs';



COMMENT ON COLUMN "public"."users"."cannot_find_group_resolved_at" IS 'Timestamp when user successfully found or was helped to find a suitable group';



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."churches"
    ADD CONSTRAINT "churches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_user_id_friend_id_key" UNIQUE ("user_id", "friend_id");



ALTER TABLE ONLY "public"."group_membership_notes"
    ADD CONSTRAINT "group_membership_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_memberships"
    ADD CONSTRAINT "group_memberships_group_id_user_id_key" UNIQUE ("group_id", "user_id");



COMMENT ON CONSTRAINT "group_memberships_group_id_user_id_key" ON "public"."group_memberships" IS 'Ensures only one membership row per user per group, regardless of status. History is preserved through status changes.';



ALTER TABLE ONLY "public"."group_memberships"
    ADD CONSTRAINT "group_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_memberships_temp"
    ADD CONSTRAINT "group_memberships_temp_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "group_referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."new_church_requests"
    ADD CONSTRAINT "new_church_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_qr_code_key" UNIQUE ("qr_code");



ALTER TABLE ONLY "public"."user_notification_settings"
    ADD CONSTRAINT "user_notification_settings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_user_id_platform_key" UNIQUE ("user_id", "platform");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "group_memberships_one_current_per_user" ON "public"."group_memberships" USING "btree" ("group_id", "user_id") WHERE ("status" = ANY (ARRAY['pending'::"text", 'active'::"text"]));



CREATE INDEX "idx_events_church_id" ON "public"."events" USING "btree" ("church_id");



CREATE INDEX "idx_events_start_date" ON "public"."events" USING "btree" ("start_date");



CREATE INDEX "idx_friendships_friend_id" ON "public"."friendships" USING "btree" ("friend_id");



CREATE INDEX "idx_friendships_user_id" ON "public"."friendships" USING "btree" ("user_id");



CREATE INDEX "idx_group_membership_notes_created_at" ON "public"."group_membership_notes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_group_membership_notes_group_id" ON "public"."group_membership_notes" USING "btree" ("group_id");



CREATE INDEX "idx_group_membership_notes_membership_id" ON "public"."group_membership_notes" USING "btree" ("membership_id");



CREATE INDEX "idx_group_membership_notes_note_type" ON "public"."group_membership_notes" USING "btree" ("note_type");



CREATE INDEX "idx_group_membership_notes_user_id" ON "public"."group_membership_notes" USING "btree" ("user_id");



CREATE INDEX "idx_group_memberships_group_id" ON "public"."group_memberships" USING "btree" ("group_id");



CREATE INDEX "idx_group_memberships_user_id" ON "public"."group_memberships" USING "btree" ("user_id");



CREATE INDEX "idx_groups_at_capacity" ON "public"."groups" USING "btree" ("at_capacity") WHERE ("at_capacity" = false);



CREATE INDEX "idx_groups_service_id" ON "public"."groups" USING "btree" ("service_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_expires_at" ON "public"."notifications" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("user_id", "read");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("user_id", "read");



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "read", "created_at" DESC) WHERE ("read" = false);



CREATE INDEX "idx_services_church_id" ON "public"."services" USING "btree" ("church_id");



CREATE INDEX "idx_tickets_event_id" ON "public"."tickets" USING "btree" ("event_id");



CREATE INDEX "idx_tickets_user_id" ON "public"."tickets" USING "btree" ("user_id");



CREATE INDEX "idx_user_notification_settings_user_id" ON "public"."user_notification_settings" USING "btree" ("user_id");



CREATE INDEX "idx_users_service_id" ON "public"."users" USING "btree" ("service_id");



CREATE OR REPLACE TRIGGER "create_user_notification_settings" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_notification_settings"();



CREATE OR REPLACE TRIGGER "push_notifications" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://knwlfuysipixbwuzvyen.supabase.co/functions/v1/push-notify-2', 'POST', '{"Content-type":"application/json","Authorization":"Bearer " || current_setting(''app.settings.sb_secret_key'')}', '{}', '1000');



CREATE OR REPLACE TRIGGER "trg_groups_creator_leader" AFTER INSERT ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "public"."fn_add_creator_as_pending_leader"();



CREATE OR REPLACE TRIGGER "trg_groups_set_created_by" BEFORE INSERT ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_group_created_by_default"();



CREATE OR REPLACE TRIGGER "trg_groups_updated" BEFORE UPDATE ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_groups_validate_service_church" BEFORE INSERT OR UPDATE OF "service_id", "church_id" ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "public"."validate_group_service_church"();



CREATE OR REPLACE TRIGGER "trg_set_group_service_id" BEFORE INSERT ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "public"."set_group_service_id_from_user"();



CREATE OR REPLACE TRIGGER "trg_set_new_church_requester_fields" BEFORE INSERT ON "public"."new_church_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_new_church_requester_fields"();



CREATE OR REPLACE TRIGGER "update_friendships_updated_at" BEFORE UPDATE ON "public"."friendships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notifications_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_notification_settings_updated_at" BEFORE UPDATE ON "public"."user_notification_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_category_fkey" FOREIGN KEY ("category") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."group_membership_notes"
    ADD CONSTRAINT "group_membership_notes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_membership_notes"
    ADD CONSTRAINT "group_membership_notes_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_membership_notes"
    ADD CONSTRAINT "group_membership_notes_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."group_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_membership_notes"
    ADD CONSTRAINT "group_membership_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_memberships"
    ADD CONSTRAINT "group_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_memberships"
    ADD CONSTRAINT "group_memberships_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."group_memberships"
    ADD CONSTRAINT "group_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "group_referrals_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "group_referrals_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "group_referrals_referred_by_user_id_fkey" FOREIGN KEY ("referred_by_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_notification_settings"
    ADD CONSTRAINT "user_notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL;



CREATE POLICY "Allow read categories" ON "public"."categories" FOR SELECT USING (true);



CREATE POLICY "Allow read churches" ON "public"."churches" FOR SELECT USING (true);



CREATE POLICY "Allow read public upcoming events" ON "public"."events" FOR SELECT USING (("is_public" = true));



CREATE POLICY "Anyone can read approved groups" ON "public"."groups" FOR SELECT USING (("status" = 'approved'::"text"));



CREATE POLICY "Anyone can read group memberships" ON "public"."group_memberships" FOR SELECT USING (true);



CREATE POLICY "Anyone can read public events" ON "public"."events" FOR SELECT USING (("is_public" = true));



CREATE POLICY "Anyone can read services" ON "public"."services" FOR SELECT USING (true);



CREATE POLICY "Authenticated service members can create groups" ON "public"."groups" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."service_id" IS NOT NULL)))) AND ("service_id" = ( SELECT "u"."service_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = "auth"."uid"())))));



CREATE POLICY "Authenticated users can read all their events" ON "public"."events" FOR SELECT TO "authenticated" USING ((("host_id" = "auth"."uid"()) OR ("is_public" = true)));



CREATE POLICY "Church admins can manage group memberships" ON "public"."group_memberships" USING ("public"."is_church_admin_for_group"("group_id", "auth"."uid"())) WITH CHECK ("public"."is_church_admin_for_group"("group_id", "auth"."uid"()));



CREATE POLICY "Church admins can manage groups" ON "public"."groups" USING ((EXISTS ( SELECT 1
   FROM ("public"."users" "u"
     JOIN "public"."services" "s" ON (("s"."id" = "groups"."service_id")))
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."roles" @> ARRAY['church_admin'::"text"]) AND ("u"."church_id" = "s"."church_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."users" "u"
     JOIN "public"."services" "s" ON (("s"."id" = "groups"."service_id")))
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."roles" @> ARRAY['church_admin'::"text"]) AND ("u"."church_id" = "s"."church_id")))));



CREATE POLICY "Church admins can read group membership notes for their service" ON "public"."group_membership_notes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."users" "admin"
     JOIN "public"."groups" "g" ON (("g"."id" = "group_membership_notes"."group_id")))
  WHERE (("admin"."id" = "auth"."uid"()) AND ("admin"."roles" @> ARRAY['church_admin'::"text"]) AND ("admin"."service_id" IS NOT NULL) AND ("g"."service_id" = "admin"."service_id")))));



CREATE POLICY "Church admins can read new church requests" ON "public"."new_church_requests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "admin"
  WHERE (("admin"."id" = "auth"."uid"()) AND ("admin"."roles" @> ARRAY['church_admin'::"text"]) AND ("admin"."service_id" IS NOT NULL) AND ("admin"."service_id" = ( SELECT "u"."service_id"
           FROM "public"."users" "u"
          WHERE ("u"."id" = "new_church_requests"."requester_id")))))));



CREATE POLICY "Group leaders can create notes for their group members" ON "public"."group_membership_notes" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."group_memberships"
  WHERE (("group_memberships"."group_id" = "group_membership_notes"."group_id") AND ("group_memberships"."user_id" = "auth"."uid"()) AND ("group_memberships"."role" = ANY (ARRAY['leader'::"text", 'admin'::"text"])) AND ("group_memberships"."status" = 'active'::"text")))) AND ("created_by_user_id" = "auth"."uid"())));



CREATE POLICY "Group leaders can update their groups" ON "public"."groups" FOR UPDATE USING ("public"."is_group_leader"("id", "auth"."uid"())) WITH CHECK ("public"."is_group_leader"("id", "auth"."uid"()));



CREATE POLICY "Group leaders can view notes for their group members" ON "public"."group_membership_notes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."group_memberships"
  WHERE (("group_memberships"."group_id" = "group_membership_notes"."group_id") AND ("group_memberships"."user_id" = "auth"."uid"()) AND ("group_memberships"."role" = ANY (ARRAY['leader'::"text", 'admin'::"text"])) AND ("group_memberships"."status" = 'active'::"text")))));



CREATE POLICY "Hosts can update their events" ON "public"."events" FOR UPDATE USING (("host_id" = "auth"."uid"()));



CREATE POLICY "Leaders can manage memberships" ON "public"."group_memberships" FOR UPDATE USING ("public"."is_group_leader"("group_id", "auth"."uid"())) WITH CHECK ("public"."is_group_leader"("group_id", "auth"."uid"()));



CREATE POLICY "Leaders can view group memberships" ON "public"."group_memberships" FOR SELECT USING ("public"."is_group_leader"("group_id", "auth"."uid"()));



CREATE POLICY "Members can log their own leave note" ON "public"."group_membership_notes" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND ("created_by_user_id" = "auth"."uid"()) AND (("note_type")::"text" = 'member_left'::"text")));



CREATE POLICY "Public can read user profiles" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Read approved groups" ON "public"."groups" FOR SELECT USING (("status" = 'approved'::"text"));



CREATE POLICY "Read own memberships" ON "public"."group_memberships" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Service church admins can update users" ON "public"."users" FOR UPDATE USING ((("auth"."uid"() = "id") OR (EXISTS ( SELECT 1
   FROM "public"."users" "admin_user"
  WHERE (("admin_user"."id" = "auth"."uid"()) AND ('church_admin'::"text" = ANY ("admin_user"."roles")) AND ("admin_user"."service_id" IS NOT NULL) AND ("admin_user"."service_id" = "users"."service_id")))))) WITH CHECK ((("auth"."uid"() = "id") OR (EXISTS ( SELECT 1
   FROM "public"."users" "admin_user"
  WHERE (("admin_user"."id" = "auth"."uid"()) AND ('church_admin'::"text" = ANY ("admin_user"."roles")) AND ("admin_user"."service_id" IS NOT NULL) AND ("admin_user"."service_id" = "users"."service_id"))))));



CREATE POLICY "Service role can create users" ON "public"."users" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role can read all users" ON "public"."users" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "User manage own notification settings" ON "public"."user_notification_settings" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "User manage own push tokens" ON "public"."user_push_tokens" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can cancel their pending request" ON "public"."group_memberships" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text")));



CREATE POLICY "Users can create events" ON "public"."events" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can create own profile" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can create tickets" ON "public"."tickets" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can leave their own membership" ON "public"."group_memberships" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("status" = 'active'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") AND ("status" = 'inactive'::"text") AND ("role" = 'member'::"text")));



CREATE POLICY "Users can read own data" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can read their own friendships" ON "public"."friendships" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "friend_id")));



CREATE POLICY "Users can read their own new church requests" ON "public"."new_church_requests" FOR SELECT TO "authenticated" USING (("requester_id" = "auth"."uid"()));



CREATE POLICY "Users can read their own profile" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can rejoin their own membership" ON "public"."group_memberships" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("status" = ANY (ARRAY['inactive'::"text", 'archived'::"text"])))) WITH CHECK ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text")));



CREATE POLICY "Users can request to join a group" ON "public"."group_memberships" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text") AND ("role" = 'member'::"text")));



CREATE POLICY "Users can see their own tickets" ON "public"."tickets" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can send friend requests" ON "public"."friendships" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text")));



CREATE POLICY "Users can submit new church requests" ON "public"."new_church_requests" FOR INSERT TO "authenticated" WITH CHECK (("requester_id" = "auth"."uid"()));



CREATE POLICY "Users can update own data" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their friendships" ON "public"."friendships" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "friend_id")));



CREATE POLICY "Users can update their own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own memberships" ON "public"."group_memberships" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."churches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "delete_own_notifications" ON "public"."notifications" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."friendships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "friendships_create_requests_20250602" ON "public"."friendships" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text")));



CREATE POLICY "friendships_delete_by_participant" ON "public"."friendships" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("friend_id" = "auth"."uid"())));



CREATE POLICY "friendships_read_own_20250602" ON "public"."friendships" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "friend_id")));



CREATE POLICY "friendships_update_own_20250602" ON "public"."friendships" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "friend_id"))) WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "friend_id")));



CREATE POLICY "gm_insert_trigger" ON "public"."group_memberships" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "gm_read_admin" ON "public"."group_memberships" FOR SELECT USING ("public"."fn_current_user_has_role"('church_admin'::"text"));



CREATE POLICY "gm_read_own" ON "public"."group_memberships" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "gm_select_friends" ON "public"."group_memberships" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."friendships" "f"
  WHERE (("f"."status" = 'accepted'::"text") AND ((("f"."user_id" = "auth"."uid"()) AND ("f"."friend_id" = "group_memberships"."user_id")) OR (("f"."friend_id" = "auth"."uid"()) AND ("f"."user_id" = "group_memberships"."user_id")))))));



CREATE POLICY "gm_select_group_members" ON "public"."group_memberships" FOR SELECT USING ("public"."is_member_of_group"("group_id"));



CREATE POLICY "gm_select_public_leaders" ON "public"."group_memberships" FOR SELECT USING ((("status" = 'active'::"text") AND ("role" = ANY (ARRAY['leader'::"text", 'admin'::"text"]))));



CREATE POLICY "gm_select_service_admin" ON "public"."group_memberships" FOR SELECT USING (("public"."current_user_has_role"('church_admin'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."groups" "g"
  WHERE (("g"."id" = "group_memberships"."group_id") AND ("g"."service_id" = "public"."current_user_service_id"()))))));



CREATE POLICY "gm_update_admin" ON "public"."group_memberships" FOR UPDATE USING ("public"."fn_current_user_has_role"('church_admin'::"text"));



ALTER TABLE "public"."group_membership_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_memberships_temp" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "groups_select_approved" ON "public"."groups" FOR SELECT TO "authenticated" USING (("status" = 'approved'::"text"));



CREATE POLICY "groups_select_church_admin" ON "public"."groups" FOR SELECT USING (("public"."current_user_has_role"('church_admin'::"text") AND ("church_id" = "public"."current_user_church_id"())));



CREATE POLICY "groups_select_church_admin_pending" ON "public"."groups" FOR SELECT TO "authenticated" USING ((("status" = 'pending'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."church_id" = "groups"."church_id") AND ('church_admin'::"text" = ANY ("u"."roles")))))));



CREATE POLICY "groups_select_creator_pending" ON "public"."groups" FOR SELECT TO "authenticated" USING ((("created_by" = "auth"."uid"()) AND ("status" = 'pending'::"text")));



CREATE POLICY "insert_notifications_any_authenticated" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "insert_own_notification_settings" ON "public"."user_notification_settings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "memberships_select_church_admin" ON "public"."group_memberships" FOR SELECT USING (("public"."current_user_has_role"('church_admin'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."groups" "g"
  WHERE (("g"."id" = "group_memberships"."group_id") AND ("g"."church_id" = "public"."current_user_church_id"()))))));



ALTER TABLE "public"."new_church_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notif_settings_upsert_own" ON "public"."user_notification_settings" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "push_tokens_upsert_own" ON "public"."user_push_tokens" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select_own_notification_settings" ON "public"."user_notification_settings" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "select_own_notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "service church admins can update users" ON "public"."users" FOR UPDATE USING ((("auth"."uid"() = "id") OR (EXISTS ( SELECT 1
   FROM "public"."users" "admin_user"
  WHERE (("admin_user"."id" = "auth"."uid"()) AND ('church_admin'::"text" = ANY ("admin_user"."roles")) AND ("admin_user"."service_id" IS NOT NULL) AND ("admin_user"."service_id" = "users"."service_id")))))) WITH CHECK ((("auth"."uid"() = "id") OR (EXISTS ( SELECT 1
   FROM "public"."users" "admin_user"
  WHERE (("admin_user"."id" = "auth"."uid"()) AND ('church_admin'::"text" = ANY ("admin_user"."roles")) AND ("admin_user"."service_id" IS NOT NULL) AND ("admin_user"."service_id" = "users"."service_id"))))));



ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "services_select_church_admin" ON "public"."services" FOR SELECT USING (("public"."current_user_has_role"('church_admin'::"text") AND ("church_id" = "public"."current_user_church_id"())));



ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update_own_notification_settings" ON "public"."user_notification_settings" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "update_own_notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_notification_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_push_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_select_church_admin" ON "public"."users" FOR SELECT USING (("public"."current_user_has_role"('church_admin'::"text") AND ("church_id" = "public"."current_user_church_id"())));



CREATE POLICY "users_select_service_admin" ON "public"."users" FOR SELECT USING (("public"."current_user_has_role"('church_admin'::"text") AND ("service_id" = "public"."current_user_service_id"())));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."app_create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb", "p_action_url" "text", "p_expires_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."app_create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb", "p_action_url" "text", "p_expires_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."app_create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb", "p_action_url" "text", "p_expires_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_group"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_group"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_group"("p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_group_atomic"("p_group_id" "uuid", "p_admin_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_group_atomic"("p_group_id" "uuid", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_group_atomic"("p_group_id" "uuid", "p_admin_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_notification_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_notification_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_notification_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_church_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_church_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_church_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_has_role"("role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_has_role"("role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_has_role"("role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_service_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_service_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_service_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decline_group_atomic"("p_group_id" "uuid", "p_admin_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decline_group_atomic"("p_group_id" "uuid", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decline_group_atomic"("p_group_id" "uuid", "p_admin_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_my_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_my_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."deny_group"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."deny_group"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."deny_group"("p_group_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."find_auth_user_id_by_phone"("p_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."find_auth_user_id_by_phone"("p_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."find_auth_user_id_by_phone"("p_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_auth_user_id_by_phone"("p_phone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_add_creator_as_pending_leader"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_add_creator_as_pending_leader"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_add_creator_as_pending_leader"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_current_user_has_role"("p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_current_user_has_role"("p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_current_user_has_role"("p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_set_group_created_by_default"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_set_group_created_by_default"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_set_group_created_by_default"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_contact"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_contact"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_contact"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_contact_admin"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_contact_admin"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_contact_admin"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_church_admin_for_group"("gid" "uuid", "uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_church_admin_for_group"("gid" "uuid", "uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_church_admin_for_group"("gid" "uuid", "uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_group_leader"("gid" "uuid", "uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_group_leader"("gid" "uuid", "uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_group_leader"("gid" "uuid", "uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_member_of_group"("target_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_member_of_group"("target_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_member_of_group"("target_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_group"("p_title" "text", "p_description" "text", "p_meeting_day" "text", "p_location" "jsonb", "p_meeting_time" time without time zone, "p_service_id" "uuid", "p_church_id" "uuid", "p_whatsapp_link" "text", "p_image_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."request_group"("p_title" "text", "p_description" "text", "p_meeting_day" "text", "p_location" "jsonb", "p_meeting_time" time without time zone, "p_service_id" "uuid", "p_church_id" "uuid", "p_whatsapp_link" "text", "p_image_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_group"("p_title" "text", "p_description" "text", "p_meeting_day" "text", "p_location" "jsonb", "p_meeting_time" time without time zone, "p_service_id" "uuid", "p_church_id" "uuid", "p_whatsapp_link" "text", "p_image_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_group_service_id_from_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_group_service_id_from_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_group_service_id_from_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_new_church_requester_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_new_church_requester_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_new_church_requester_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_group_service_church"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_group_service_church"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_group_service_church"() TO "service_role";


















GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."churches" TO "anon";
GRANT ALL ON TABLE "public"."churches" TO "authenticated";
GRANT ALL ON TABLE "public"."churches" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."friendships" TO "anon";
GRANT ALL ON TABLE "public"."friendships" TO "authenticated";
GRANT ALL ON TABLE "public"."friendships" TO "service_role";



GRANT ALL ON TABLE "public"."group_membership_notes" TO "anon";
GRANT ALL ON TABLE "public"."group_membership_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."group_membership_notes" TO "service_role";



GRANT ALL ON TABLE "public"."group_memberships" TO "anon";
GRANT ALL ON TABLE "public"."group_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."group_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."group_memberships_temp" TO "anon";
GRANT ALL ON TABLE "public"."group_memberships_temp" TO "authenticated";
GRANT ALL ON TABLE "public"."group_memberships_temp" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."new_church_requests" TO "anon";
GRANT ALL ON TABLE "public"."new_church_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."new_church_requests" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."referrals" TO "anon";
GRANT ALL ON TABLE "public"."referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."referrals" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON TABLE "public"."user_notification_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_notification_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notification_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."user_push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."user_push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























