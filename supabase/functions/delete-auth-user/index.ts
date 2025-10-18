// Supabase Edge Function to delete auth user when database user is deleted
// Triggered by database webhook - SECURED with webhook secret verification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

// Verify webhook secret to ensure request is from our database
function verifyWebhook(req: Request): boolean {
  const signature = req.headers.get('x-webhook-signature');
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
  
  if (!signature || !webhookSecret) {
    console.error('Missing webhook signature or secret');
    return false;
  }

  // Simple secret verification - the signature should match our secret
  return signature === webhookSecret;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // SECURITY: Verify webhook signature to prevent unauthorized access
  if (!verifyWebhook(req)) {
    console.error('Unauthorized webhook request - signature verification failed');
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unauthorized - invalid webhook signature',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      }
    );
  }

  try {
    // Get the payload from the webhook
    const payload = await req.json();
    console.log('Webhook payload:', payload);

    // Extract user ID from the deleted record
    const userId = payload.record?.id || payload.old_record?.id;

    if (!userId) {
      throw new Error('No user ID found in webhook payload');
    }

    // Additional security: Verify this is a DELETE operation
    if (payload.type !== 'DELETE') {
      console.error('Invalid webhook type - only DELETE operations are allowed');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid webhook type - only DELETE operations are allowed',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Additional security: Verify the table is 'users'
    if (payload.table !== 'users') {
      console.error('Invalid webhook table - only users table deletions are allowed');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid webhook table - only users table deletions are allowed',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Deleting auth user:', userId);

    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Delete the auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Error deleting auth user:', error);
      throw error;
    }

    console.log('Successfully deleted auth user:', userId);

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        message: 'Auth user deleted successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in delete-auth-user function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

