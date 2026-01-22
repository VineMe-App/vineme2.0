-- Allow contact_email to be optional for new church requests

ALTER TABLE public.new_church_requests
ALTER COLUMN contact_email DROP NOT NULL;
