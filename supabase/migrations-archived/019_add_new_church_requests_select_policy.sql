-- Allow users to read their own new church requests

CREATE POLICY "Users can read their own new church requests"
ON public.new_church_requests
FOR SELECT
TO authenticated
USING (requester_id = auth.uid());
