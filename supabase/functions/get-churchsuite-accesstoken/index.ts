// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const { church_id } = await req.json();

  const CHURCHSUITE_AUTH_API_URL = Deno.env.get('CHURCHSUITE_AUTH_API_URL');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data, error } = await supabase
    .rpc('get_churchsuite_secret', {
      p_church_id: church_id,
    })
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return Response.json(
      { error: 'No ChurchSuite connection found for this church' },
      { status: 404 }
    );
  }

  const credentials = btoa(`${data.identifier}:${data.secret}`);

  const response = await fetch(`${CHURCHSUITE_AUTH_API_URL}/oauth2/token`, {
    headers: {
      'content-type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    method: 'POST',
    body: JSON.stringify({
      grant_type: 'client_credentials',
      scope: 'addressbook.read',
    }),
  });
console.log(response)

  const authData = await response.json();

  // update the existing connection's access token
  await supabase
    .from('churchsuite_connections')
    .update({ access_token: authData['access_token'] })
    .eq('church_id', church_id);

  return Response.json(authData);
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-churchsuite-accesstoken' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
