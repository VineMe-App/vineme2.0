// Supabase Edge Function: create-referred-user
// Securely creates an auth user and a public.users profile for referrals using the service role key.

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CreateReferredUserPayload {
  email: string
  phone?: string
  firstName?: string
  lastName?: string
  note?: string
  referrerId?: string
  groupId?: string
}

function buildFullName(firstName?: string, lastName?: string): string {
  if (firstName && lastName) return `${firstName.trim()} ${lastName.trim()}`
  return firstName?.trim() || ''
}

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 16; i++) password += chars.charAt(Math.floor(Math.random() * chars.length))
  return password
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, error: 'Method Not Allowed' }), { status: 200 })
    }

    const payload = (await req.json()) as CreateReferredUserPayload
    if (!payload?.email || typeof payload.email !== 'string') {
      return new Response(JSON.stringify({ ok: false, error: 'Email is required' }), { status: 200 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Create auth user (email must be unique)
    const tempPassword = generateSecurePassword()
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: payload.email,
      password: tempPassword,
      email_confirm: false,
      user_metadata: {
        name: buildFullName(payload.firstName, payload.lastName),
        phone: payload.phone || '',
        referred: true,
        referrer_id: payload.referrerId || null,
      },
    })

    if (authError || !authData?.user) {
      // If duplicate, report but continue with profile/referral attempt
      if (!authError?.message?.toLowerCase().includes('already registered')) {
        return new Response(
          JSON.stringify({ ok: false, error: authError?.message || 'Failed to create auth user' }),
          { status: 200 },
        )
      }
    }

    const userId = authData?.user?.id || 'unknown'

    // Determine church_id and service_id
    let churchId: string | null = null
    let serviceId: string | null = null

    if (payload.groupId) {
      const { data: groupRow, error: groupErr } = await supabase
        .from('groups')
        .select('church_id, service_id')
        .eq('id', payload.groupId)
        .single()
      if (groupErr) {
        return new Response(
          JSON.stringify({ ok: false, error: `Group not found: ${groupErr.message}` }),
          { status: 200 },
        )
      }
      churchId = groupRow?.church_id ?? null
      serviceId = groupRow?.service_id ?? null
    } else if (payload.referrerId) {
      const { data: refUser, error: refErr } = await supabase
        .from('users')
        .select('church_id, service_id')
        .eq('id', payload.referrerId)
        .single()
      if (!refErr && refUser) {
        churchId = refUser.church_id ?? null
        serviceId = refUser.service_id ?? null
      }
    }

    // Create public.users profile
    const now = new Date().toISOString()
    const { error: profileError } = await supabase.from('users').insert({
      id: userId,
      name: buildFullName(payload.firstName, payload.lastName),
      newcomer: true,
      onboarding_complete: false,
      roles: ['user'],
      church_id: churchId,
      service_id: serviceId,
      created_at: now,
      updated_at: now,
    })

    if (profileError) {
      // Cleanup auth user on profile error
      await supabase.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({ ok: false, error: `Failed to create user profile: ${profileError.message}` }),
        { status: 200 },
      )
    }

    // Optionally trigger verification email here
    try {
      const redirectUrl = 'vineme://auth/verify-email'
      await supabase.auth.resend({
        type: 'signup',
        email: payload.email,
        options: { emailRedirectTo: redirectUrl },
      })
    } catch (_) {
      // Non-fatal
    }

    // Create referral record
    if (payload.groupId) {
      // Create referral row first per spec: id = referred user id (primary key), referred_by_user_id = referrer
      const { error: refError } = await supabase.from('referrals').insert({
        id: userId,
        group_id: payload.groupId,
        referred_by_user_id: payload.referrerId || null,
        church_id: churchId,
        note: payload.note || null,
        created_at: now,
      })
      if (refError) {
        return new Response(
          JSON.stringify({ ok: true, userId, referralCreated: false, warning: `Referral row not created: ${refError.message}` }),
          { status: 200 },
        )
      }

      // Also create a pending group_membership linked to this referral
      const { error: memError } = await supabase.from('group_memberships').insert({
        group_id: payload.groupId,
        user_id: userId,
        role: 'member',
        status: 'pending',
        referral_id: userId,
        journey_status: 1
      })
      if (memError) {
        return new Response(
          JSON.stringify({ ok: true, userId, referralCreated: true, membershipCreated: false, warning: `Membership not created: ${memError.message}` }),
          { status: 200 },
        )
      }
    } else {
      // General referral without group
      const { error: refError } = await supabase.from('referrals').insert({
        id: userId,
        group_id: null,
        referred_by_user_id: payload.referrerId || null,
        church_id: churchId,
        note: payload.note || null,
        created_at: now,
      })
      if (refError) {
        return new Response(
          JSON.stringify({ ok: true, userId, referralCreated: false, warning: `Referral row not created: ${refError.message}` }),
          { status: 200 },
        )
      }
    }

    // Return created user id
    return new Response(JSON.stringify({ ok: true, userId, referralCreated: Boolean(payload.groupId), membershipCreated: Boolean(payload.groupId) }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 200 })
  }
})

