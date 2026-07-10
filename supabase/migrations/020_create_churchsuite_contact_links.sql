-- Store the relationship between a VineMe user and a ChurchSuite contact.
-- The Edge Function writes this table with the service role key; RLS below
-- allows users to inspect their own status and church admins to review their
-- church's ambiguous or failed matches.

CREATE TABLE IF NOT EXISTS public.churchsuite_contact_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  churchsuite_contact_id text,
  match_status text NOT NULL CHECK (
    match_status IN (
      'linked',
      'created',
      'manual_review',
      'pending_retry',
      'sync_failed'
    )
  ),
  match_reason text,
  matched_by text[] NOT NULL DEFAULT '{}',
  candidate_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_error text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, church_id)
);

CREATE INDEX IF NOT EXISTS idx_churchsuite_contact_links_church_status
  ON public.churchsuite_contact_links(church_id, match_status);

CREATE INDEX IF NOT EXISTS idx_churchsuite_contact_links_contact_id
  ON public.churchsuite_contact_links(churchsuite_contact_id)
  WHERE churchsuite_contact_id IS NOT NULL;

ALTER TABLE public.churchsuite_contact_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own ChurchSuite link" ON public.churchsuite_contact_links;
CREATE POLICY "Users can read own ChurchSuite link"
  ON public.churchsuite_contact_links
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Church admins can read ChurchSuite links for their church" ON public.churchsuite_contact_links;
CREATE POLICY "Church admins can read ChurchSuite links for their church"
  ON public.churchsuite_contact_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users admin_user
      WHERE admin_user.id = auth.uid()
        AND (
          (
            admin_user.church_id = churchsuite_contact_links.church_id
            AND admin_user.roles @> ARRAY['church_admin']::text[]
          )
          OR admin_user.roles @> ARRAY['superadmin']::text[]
        )
    )
  );

DROP POLICY IF EXISTS "Church admins can update review status for their church" ON public.churchsuite_contact_links;
CREATE POLICY "Church admins can update review status for their church"
  ON public.churchsuite_contact_links
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users admin_user
      WHERE admin_user.id = auth.uid()
        AND (
          (
            admin_user.church_id = churchsuite_contact_links.church_id
            AND admin_user.roles @> ARRAY['church_admin']::text[]
          )
          OR admin_user.roles @> ARRAY['superadmin']::text[]
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users admin_user
      WHERE admin_user.id = auth.uid()
        AND (
          (
            admin_user.church_id = churchsuite_contact_links.church_id
            AND admin_user.roles @> ARRAY['church_admin']::text[]
          )
          OR admin_user.roles @> ARRAY['superadmin']::text[]
        )
    )
  );

CREATE OR REPLACE FUNCTION public.update_churchsuite_contact_links_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_churchsuite_contact_links_updated_at
  ON public.churchsuite_contact_links;

CREATE TRIGGER update_churchsuite_contact_links_updated_at
  BEFORE UPDATE ON public.churchsuite_contact_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_churchsuite_contact_links_updated_at();

COMMENT ON TABLE public.churchsuite_contact_links IS
  'Link and sync status between VineMe users and ChurchSuite contacts.';
