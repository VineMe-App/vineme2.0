CREATE TABLE churchsuite_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  churchsuite_identifier text NOT NULL,
  churchsuite_secret_id uuid NOT NULL, -- vault reference
  access_token text,
  access_token_expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(church_id)
);
