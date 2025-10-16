// Supabase Edge Function: create-referred-user
// Securely creates an auth user and a public.users profile for referrals using the service role key.

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
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

function generateSecurePassword(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++)
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  return password;
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

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Method Not Allowed' }),
        { status: 200 }
      );
    }

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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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
    let existingUserId: string | null = null;
    let existingUser: any = null;

    // First, try to find by email in auth.users
    try {
      const { data: emailUser } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const emailMatch = emailUser?.users?.find(
        (user) => user.email === payload.email
      );
      if (emailMatch) {
        existingUserId = emailMatch.id;
        existingUser = emailMatch;
      }
    } catch (e) {
      // If listUsers fails, continue without existing user check
    }

    // If not found by email, try by phone
    if (!existingUserId && payload.phone) {
      try {
        const { data: phoneUsers } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const normalizedPhone = normalizePhone(payload.phone);
        if (normalizedPhone) {
          const phoneMatch = phoneUsers?.users?.find((user) => {
            const userPhone = normalizePhone(user.phone);
            const userMetaPhone = normalizePhone(user.user_metadata?.phone);
            return (
              userPhone === normalizedPhone || userMetaPhone === normalizedPhone
            );
          });
          if (phoneMatch) {
            existingUserId = phoneMatch.id;
            existingUser = phoneMatch;
          }
        }
      } catch (e) {
        // If listUsers fails, continue without existing user check
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
    } else {
      // Create new auth user
      const tempPassword = generateSecurePassword();
      const normalizedPhone = normalizePhone(payload.phone);
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: payload.email,
          password: tempPassword,
          email_confirm: false,
          phone: normalizedPhone ?? undefined,
          user_metadata: {
            name: buildFullName(payload.firstName, payload.lastName),
            phone: normalizedPhone || payload.phone || '',
            referred: true,
            referrer_id: payload.referrerId,
          },
        });

      if (authError) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: `Failed to create auth user: ${authError.message}`,
          }),
          { status: 200 }
        );
      }

      if (!authData?.user) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'Auth user creation returned no user data',
          }),
          { status: 200 }
        );
      }

      userId = authData.user.id;
      createdAuthUser = true;
      console.log('Created new user:', userId);
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
