// Supabase Edge Function: create-referred-user
// Securely creates an auth user and a public.users profile for referrals using the service role key.

// @ts-ignore - Deno is available in Supabase Edge Functions runtime
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// @ts-ignore - Deno imports are resolved at runtime in Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
// @ts-ignore - ESM imports are resolved at runtime in Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface CreateReferredUserPayload {
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  note?: string;
  referrerId?: string;
  groupId?: string;
}

function buildFullName(firstName?: string, lastName?: string): string {
  if (firstName && lastName) return `${firstName.trim()} ${lastName.trim()}`;
  return firstName?.trim() || '';
}

function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9+]/g, '');
  if (!digits) return null;

  const cleaned = digits.startsWith('+')
    ? `+${digits.slice(1).replace(/[^0-9]/g, '')}`
    : digits.replace(/[^0-9]/g, '');

  if (!cleaned.length) return null;

  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

serve(async (req: any) => {
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Method Not Allowed' }),
        { status: 200 }
      );
    }

    // Create Supabase client with user's session for authentication
    const authHeader = req.headers.get('authorization') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client to verify user session
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });
    
    // Parse payload first to get referrerId
    const payload = (await req.json()) as CreateReferredUserPayload;
    
    if (!payload?.email || typeof payload.email !== 'string') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Email is required' }),
        { status: 200 }
      );
    }

    if (!payload.referrerId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Referrer ID is required' }),
        { status: 200 }
      );
    }
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized - authentication required' }),
        { status: 401 }
      );
    }
    
    // Ensure the authenticated user is the referrer
    if (user.id !== payload.referrerId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized - referrer ID mismatch' }),
        { status: 403 }
      );
    }
    
    // Create service role client for admin operations
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey
    );

    // Get referrer's church info first
    const { data: referrerData, error: referrerError } = await supabase
      .from('users')
      .select('church_id, service_id')
      .eq('id', payload.referrerId)
      .single();

    if (referrerError) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Referrer not found: ${referrerError.message}`,
        }),
        { status: 200 }
      );
    }

    const churchId = referrerData.church_id;
    const serviceId = referrerData.service_id;

    if (!churchId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Referrer has no church assigned' }),
        { status: 200 }
      );
    }

    // Check if user already exists by email or phone
    // We need to iterate through all pages to avoid missing users beyond the first 1000
    let existingUserId: string | null = null;
    let existingUser: any = null;

    // Helper function to search for user by email across all pages
    const findUserByEmail = async (email: string): Promise<any | null> => {
      let page = 1;
      const perPage = 1000;
      
      while (true) {
        try {
          const { data, error } = await supabase.auth.admin.listUsers({
            page,
            perPage,
          });
          
          if (error) {
            console.log(`Error listing users page ${page}:`, error.message);
            break;
          }
          
          if (!data?.users || data.users.length === 0) {
            // No more users to check
            break;
          }
          
          // Search for matching email in current page
          const match = data.users.find((user: any) => user.email === email);
          if (match) {
            return match;
          }
          
          // If we got fewer users than perPage, we've reached the last page
          if (data.users.length < perPage) {
            break;
          }
          
          page++;
        } catch (e) {
          console.log(`Exception listing users page ${page}:`, e);
          break;
        }
      }
      
      return null;
    };

    // Helper function to search for user by phone across all pages
    const findUserByPhone = async (phone: string): Promise<any | null> => {
      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return null;
      }
      
      let page = 1;
      const perPage = 1000;
      
      while (true) {
        try {
          const { data, error } = await supabase.auth.admin.listUsers({
            page,
            perPage,
          });
          
          if (error) {
            console.log(`Error listing users page ${page}:`, error.message);
            break;
          }
          
          if (!data?.users || data.users.length === 0) {
            // No more users to check
            break;
          }
          
          // Search for matching phone in current page
          const match = data.users.find((user: any) => {
            const userPhone = normalizePhone(user.phone);
            const userMetaPhone = normalizePhone(user.user_metadata?.phone);
            return (
              userPhone === normalizedPhone || userMetaPhone === normalizedPhone
            );
          });
          
          if (match) {
            return match;
          }
          
          // If we got fewer users than perPage, we've reached the last page
          if (data.users.length < perPage) {
            break;
          }
          
          page++;
        } catch (e) {
          console.log(`Exception listing users page ${page}:`, e);
          break;
        }
      }
      
      return null;
    };

    // First, try to find by email in auth.users (searching all pages)
    try {
      const emailMatch = await findUserByEmail(payload.email);
      if (emailMatch) {
        existingUserId = emailMatch.id;
        existingUser = emailMatch;
      }
    } catch (e) {
      console.log('Error finding user by email:', e);
      // Continue without existing user check
    }

    // If not found by email, try by phone (searching all pages)
    if (!existingUserId && payload.phone) {
      try {
        const phoneMatch = await findUserByPhone(payload.phone);
        if (phoneMatch) {
          existingUserId = phoneMatch.id;
          existingUser = phoneMatch;
        }
      } catch (e) {
        console.log('Error finding user by phone:', e);
        // Continue without existing user check
      }
    }

    let userId: string;
    let createdAuthUser = false;
    let reusedExistingUser = false;

    if (existingUserId) {
      // User already exists - reuse them
      userId = existingUserId;
      reusedExistingUser = true;
      console.log('Reusing existing user:', userId);
      
      // Send verification/referral email to existing user
      try {
        const { data: existingAuthUser } = await supabase.auth.admin.getUserById(userId);
        if (existingAuthUser?.user) {
          let emailToUse = existingAuthUser.user.email;
          
          // If user doesn't have an email, link the referral email to their account
          if (!emailToUse && payload.email) {
            const redirectUrl = `https://vineme.app/verify-email?redirect=/profile/communication&email=${encodeURIComponent(payload.email)}`;
            // Update user email via admin API
            const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
              email: payload.email,
            });
            
            if (updateError) {
              console.log('Failed to link email to existing user:', updateError.message);
              // Continue without email - referral will still be created
            } else {
              emailToUse = payload.email;
              console.log('Linked referral email to existing user account');
              
              // Manually send verification email since admin API doesn't auto-send
              const { error: resendError } = await supabase.auth.resend({
                type: 'signup',
                email: emailToUse,
                options: {
                  emailRedirectTo: redirectUrl,
                },
              });
              
              if (resendError) {
                console.log('Failed to send verification email after linking:', resendError.message);
                // Non-fatal error - email was linked but verification email failed
              } else {
                console.log('Sent verification email to newly linked email');
              }
            }
          } else if (emailToUse && !existingAuthUser.user.email_confirmed_at) {
            // User has email but it's not verified - send verification email
            const redirectUrl = `https://vineme.app/verify-email?redirect=/profile/communication&email=${encodeURIComponent(emailToUse)}`;
            // Use resend to actually send the email
            const { error: resendError } = await supabase.auth.resend({
              type: 'signup',
              email: emailToUse,
              options: {
                emailRedirectTo: redirectUrl,
              },
            });
            
            if (resendError) {
              console.log('Failed to send verification email to existing user:', resendError.message);
              // Non-fatal error - continue without sending email
            } else {
              console.log('Sent verification email to existing unverified user');
            }
          } else if (emailToUse && existingAuthUser.user.email_confirmed_at) {
            // Email is already verified - send a referral notification email
            // Note: This would require a custom email template or notification system
            // For now, we'll just log that the user was referred
            console.log(`User ${userId} was referred but email is already verified. Referral notification could be sent to ${emailToUse}`);
            // TODO: Implement referral notification email for verified users
          } else {
            console.log('Existing user has no email and could not link referral email - no email sent');
          }
        }
      } catch (e) {
        console.log('Error checking/sending email to existing user:', e);
        // Non-fatal error - continue
      }
    } else {
      // Invite new user via Supabase's built-in invitation system
      const normalizedPhone = normalizePhone(payload.phone);
      // Use the HTTPS redirect URL for email verification
      const redirectUrl = `https://vineme.app/verify-email?redirect=/profile/communication&email=${encodeURIComponent(payload.email)}`;
      const { data: authData, error: authError } =
        await supabase.auth.admin.inviteUserByEmail(payload.email, {
          data: {
            name: buildFullName(payload.firstName, payload.lastName),
            phone: normalizedPhone || payload.phone || '',
            referred: true,
            referrer_id: payload.referrerId,
            church_id: churchId,
            service_id: serviceId,
          },
          redirectTo: redirectUrl,
        });

      if (authError) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: `Failed to invite user: ${authError.message}`,
          }),
          { status: 200 }
        );
      }

      if (!authData?.user) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'User invitation returned no user data',
          }),
          { status: 200 }
        );
      }

      userId = authData.user.id;
      createdAuthUser = true;
      console.log('Invited new user:', userId);

      // Update the user to set the phone field for proper phone authentication
      if (normalizedPhone) {
        const { error: phoneUpdateError } = await supabase.auth.admin.updateUserById(userId, {
          phone: normalizedPhone,
        });

        if (phoneUpdateError) {
          console.log('Failed to update user phone:', phoneUpdateError.message);
          // Non-fatal error - continue without phone update
        } else {
          console.log('Updated user phone number for authentication');
        }
      }

      // Send verification email explicitly to ensure it's sent
      // inviteUserByEmail should send an email, but we'll also send a verification email
      // to ensure the user receives it with the correct redirect URL
      try {
        const { error: resendError } = await supabase.auth.admin.generateLink({
          type: 'signup',
          email: payload.email,
          options: {
            redirectTo: redirectUrl,
          },
        });
        
        if (resendError) {
          console.log('Failed to send verification email:', resendError.message);
          // Non-fatal error - inviteUserByEmail should have sent an email already
        } else {
          console.log('Sent verification email to new user');
        }
      } catch (e) {
        console.log('Error sending verification email:', e);
        // Non-fatal error - inviteUserByEmail should have sent an email already
      }
    }

    // Check if user profile already exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id, first_name, last_name, church_id, service_id')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      // Create user profile
      const { error: profileError } = await supabase.from('users').insert({
        id: userId,
        first_name: payload.firstName || null,
        last_name: payload.lastName || null,
        newcomer: true,
        onboarding_complete: false,
        roles: ['user'],
        church_id: churchId,
        service_id: serviceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        if (createdAuthUser) {
          await supabase.auth.admin.deleteUser(userId);
        }
        return new Response(
          JSON.stringify({
            ok: false,
            error: `Failed to create user profile: ${profileError.message}`,
          }),
          { status: 200 }
        );
      }
      console.log('Created new user profile');

      // Create default privacy settings for the new user
      const { error: privacyError } = await supabase
        .from('contact_privacy_settings')
        .upsert(
          {
            user_id: userId,
            allow_email_sharing: true,
            allow_phone_sharing: true,
            allow_contact_by_leaders: true,
          },
          {
            onConflict: 'user_id',
            ignoreDuplicates: false,
          }
        );

      if (privacyError) {
        console.log('Failed to create privacy settings:', privacyError.message);
        // Non-fatal error - continue without privacy settings
      } else {
        console.log('Created default privacy settings');
      }
    } else {
      // Update existing profile with new church info if needed
      const updates: any = {};
      if (!existingProfile.church_id && churchId) {
        updates.church_id = churchId;
      }
      if (!existingProfile.service_id && serviceId) {
        updates.service_id = serviceId;
      }
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        await supabase.from('users').update(updates).eq('id', userId);
        console.log('Updated existing user profile with church info');
      }
    }

    // Check if referral already exists before attempting to create
    // Check if ANY referrer has already referred this user to this group
    let referralQuery = supabase
      .from('referrals')
      .select('id, referred_by_user_id')
      .eq('referred_user_id', userId);

    if (payload.groupId) {
      referralQuery = referralQuery.eq('group_id', payload.groupId);
    } else {
      referralQuery = referralQuery.is('group_id', null);
    }

    const { data: existingReferral } = await referralQuery.maybeSingle();

    if (existingReferral) {
      // Check if it's the same referrer (exact duplicate)
      if (existingReferral.referred_by_user_id === payload.referrerId) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'DUPLICATE_REFERRAL',
            errorCode: 'DUPLICATE_REFERRAL',
            message: 'This person has already been referred to this group by you.',
          }),
          { status: 200 }
        );
      } else {
        // Different referrer, but user already referred to this group
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'DUPLICATE_REFERRAL',
            errorCode: 'DUPLICATE_REFERRAL',
            message: 'This person has already been referred to this group by someone else.',
          }),
          { status: 200 }
        );
      }
    }

    // Create referral record
    const { data: referralRow, error: referralError } = await supabase
      .from('referrals')
      .insert({
        group_id: payload.groupId || null,
        referred_by_user_id: payload.referrerId,
        referred_user_id: userId,
        church_id: churchId,
        note: payload.note || null,
      })
      .select('id')
      .single();

    if (referralError) {
      // Check if it's a unique constraint violation (duplicate referral)
      if (
        referralError.message?.includes('duplicate') ||
        referralError.message?.includes('unique') ||
        referralError.code === '23505' // PostgreSQL unique violation error code
      ) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'DUPLICATE_REFERRAL',
            errorCode: 'DUPLICATE_REFERRAL',
            message: 'This person has already been referred to this group by you.',
          }),
          { status: 200 }
        );
      }

      return new Response(
        JSON.stringify({
          ok: false,
          error: `Failed to create referral: ${referralError.message}`,
        }),
        { status: 200 }
      );
    }

    // Create group membership if groupId provided
    let membershipCreated = false;
    if (payload.groupId && referralRow?.id) {
      // Check if user is already a member of this group
      const { data: existingMembership } = await supabase
        .from('group_memberships')
        .select('id')
        .eq('group_id', payload.groupId)
        .eq('user_id', userId)
        .single();

      if (!existingMembership) {
        // Create new group membership
        const { error: memError } = await supabase
          .from('group_memberships')
          .insert({
            group_id: payload.groupId,
            user_id: userId,
            role: 'member',
            status: 'pending',
            referral_id: referralRow.id,
            journey_status: null, // Leave as null as requested
          });

        if (!memError) {
          membershipCreated = true;
          console.log('Created new group membership');
        } else {
          console.log('Failed to create group membership:', memError.message);
        }
      } else {
        console.log('User already a member of this group');
      }
    }

    // If no specific group was selected, mark the user as needing help
    if (!payload.groupId) {
      await supabase
        .from('users')
        .update({
          cannot_find_group: true,
          cannot_find_group_requested_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        userId,
        referralId: referralRow?.id,
        referralCreated: Boolean(referralRow?.id),
        membershipCreated,
        reusedExistingUser,
      }),
      { status: 200 }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200,
    });
  }
});
