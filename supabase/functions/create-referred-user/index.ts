// Supabase Edge Function: create-referred-user
// Securely creates an auth user and a public.users profile for referrals using the service role key.

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient, type User } from 'https://esm.sh/@supabase/supabase-js@2'

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

function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/[^0-9+]/g, '')
  if (!digits) return null

  const cleaned = digits.startsWith('+')
    ? `+${digits.slice(1).replace(/[^0-9]/g, '')}`
    : digits.replace(/[^0-9]/g, '')

  if (!cleaned.length) return null

  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`
}

async function findExistingUser(
  client: ReturnType<typeof createClient>,
  email?: string,
  phone?: string | null
): Promise<User | null> {
  if (email) {
    const { data } = await client.auth.admin.getUserByEmail(email)
    if (data?.user) {
      return data.user
    }
  }

  if (phone) {
    const normalizedPhone = normalizePhone(phone)
    if (normalizedPhone) {
      const { data } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const match = data?.users?.find((user) => {
        const authPhone = normalizePhone(user.phone)
        const metaPhone = normalizePhone((user.user_metadata as Record<string, any> | undefined)?.phone)
        return authPhone === normalizedPhone || metaPhone === normalizedPhone
      })

      if (match) {
        return match
      }
    }
  }

  return null
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

    const normalizedPhone = normalizePhone(payload.phone)
    let authUser = await findExistingUser(supabase, payload.email, normalizedPhone)
    let userId = authUser?.id ?? null
    let createdAuthUser = false
    const warnings: string[] = []

    if (!userId) {
      const tempPassword = generateSecurePassword()
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: payload.email,
        password: tempPassword,
        email_confirm: false,
        phone: normalizedPhone ?? undefined,
        user_metadata: {
          name: buildFullName(payload.firstName, payload.lastName),
          phone: normalizedPhone || payload.phone || '',
          referred: true,
          referrer_id: payload.referrerId || null,
        },
      })

      if (authError || !authData?.user) {
        if (authError?.message?.toLowerCase().includes('already registered')) {
          authUser = await findExistingUser(supabase, payload.email, normalizedPhone)
          userId = authUser?.id ?? null
        } else {
          return new Response(
            JSON.stringify({ ok: false, error: authError?.message || 'Failed to create auth user' }),
            { status: 200 },
          )
        }
      } else {
        authUser = authData.user
        userId = authData.user.id
        createdAuthUser = true
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unable to determine referred user account' }),
        { status: 200 },
      )
    }

    const now = new Date().toISOString()

    const { data: profileRows, error: profileLookupError } = await supabase
      .from('users')
      .select('id, name, church_id, service_id')
      .eq('id', userId)
      .limit(1)

    if (profileLookupError) {
      return new Response(
        JSON.stringify({ ok: false, error: `Failed to look up user profile: ${profileLookupError.message}` }),
        { status: 200 },
      )
    }

    const existingProfile = profileRows?.[0] ?? null
    const requestedName = buildFullName(payload.firstName, payload.lastName)

    let churchId: string | null = existingProfile?.church_id ?? null
    let serviceId: string | null = existingProfile?.service_id ?? null

    if (!churchId && payload.groupId) {
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

      churchId = groupRow?.church_id ?? churchId
      serviceId = groupRow?.service_id ?? serviceId
    }

    if (!churchId && payload.referrerId) {
      const { data: refUser, error: refErr } = await supabase
        .from('users')
        .select('church_id, service_id')
        .eq('id', payload.referrerId)
        .single()

      if (!refErr && refUser) {
        churchId = refUser.church_id ?? churchId
        serviceId = refUser.service_id ?? serviceId
      }
    }

    if (!existingProfile) {
      const { error: profileError } = await supabase.from('users').insert({
        id: userId,
        name: requestedName || (authUser?.user_metadata as Record<string, any> | undefined)?.name || '',
        newcomer: true,
        onboarding_complete: false,
        roles: ['user'],
        church_id: churchId,
        service_id: serviceId,
        created_at: now,
        updated_at: now,
      })

      if (profileError) {
        if (createdAuthUser) {
          await supabase.auth.admin.deleteUser(userId)
        }
        return new Response(
          JSON.stringify({ ok: false, error: `Failed to create user profile: ${profileError.message}` }),
          { status: 200 },
        )
      }
    } else {
      const updates: Record<string, any> = {}
      if (requestedName && !existingProfile.name) {
        updates.name = requestedName
      }
      if (!existingProfile.church_id && churchId) {
        updates.church_id = churchId
      }
      if (!existingProfile.service_id && serviceId) {
        updates.service_id = serviceId
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = now
        const { error: profileUpdateError } = await supabase
          .from('users')
          .update(updates)
          .eq('id', userId)

        if (profileUpdateError) {
          warnings.push(`Profile update failed: ${profileUpdateError.message}`)
        }
      }
    }

    if (!churchId) {
      warnings.push('Unable to determine church for referral')
    }

    if (createdAuthUser) {
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
    }

    let referralId: string | null = null
    const { data: referralRow, error: referralError } = await supabase
      .from('referrals')
      .insert({
        group_id: payload.groupId || null,
        referred_by_user_id: payload.referrerId || null,
        referred_user_id: userId,
        church_id: churchId,
        note: payload.note || null,
      })
      .select('id')
      .single()

    if (referralError) {
      warnings.push(`Referral row not created: ${referralError.message}`)
    } else {
      referralId = referralRow?.id ?? null
    }

    let membershipCreated = false
    if (payload.groupId && referralId) {
      const { error: memError } = await supabase.from('group_memberships').insert({
        group_id: payload.groupId,
        user_id: userId,
        role: 'member',
        status: 'pending',
        referral_id: referralId,
        journey_status: 1,
      })

      if (memError) {
        warnings.push(`Membership not created: ${memError.message}`)
      } else {
        membershipCreated = true
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        userId,
        referralId,
        referralCreated: Boolean(referralId),
        membershipCreated,
        reusedExistingUser: !createdAuthUser,
        warnings: warnings.length ? warnings : undefined,
      }),
      { status: 200 },
    )
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 200 })
  }
})
