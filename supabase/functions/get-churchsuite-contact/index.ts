// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const { mobileNumber, church_id } = await req.json();
  const CHURCHSUITE_API_URL = Deno.env.get('CHURCHSUITE_API_URL');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data, error } = await supabase
    .from('churchsuite_connections')
    .select('access_token', 'access_token_expires_at')
    .eq('church_id', church_id)
    .single();

  const getChurchsuiteAccessToken = async () => {
    const CHURCHSUITE_AUTH_API_URL = Deno.env.get('CHURCHSUITE_AUTH_API_URL');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabase.rpc('get_churchsuite_secret', {
      p_church_id: church_id,
    });

    // check identifier and secret exist first!!
    const response = await fetch(`${CHURCHSUITE_AUTH_API_URL}/oauth2/token`, {
      headers: {
        'content-type': 'application/json',
        Authorization: `${data.identifier}:${data.secret}`,
      },
      method: 'POST',
      body: JSON.stringify({
        grant_type: 'client_credentials',
        scope: 'full_access',
      }),
    });

    const authData = await response.json();

    // put access_token and expiry into db
    await supabase
      .from('churchsuite_connections')
      .insert({ access_token: authData['access_token'] });

    return authData;
  };

  const getChurchsuiteContact = async (validAccessToken: string) => {
    const response = await fetch(
      `http://host.docker.internal:8030/addressbook/contacts?q=${mobileNumber}`,
      {
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
        },
      }
    );
    const data = await response.json();
    return data;
  };

  const { access_token, access_token_expires_at } = data;
  // check is valid
  if (access_token && new Date() > new Date(access_token_expires_at)) {
    const churchsuiteContactData = getChurchsuiteContact(access_token);
    return new Response(JSON.stringify(churchsuiteContactData), {
      headers: { 'Content-Type': 'application/json' },
    });
  } else {
    console.log('no token found');
    const { access_token: newAccessToken } = await getChurchsuiteAccessToken();
    console.log('new access token', newAccessToken);
    const churchsuiteContactData = await getChurchsuiteContact(newAccessToken);
    return new Response(JSON.stringify(churchsuiteContactData), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-churchsuite-contact' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
