# Supabase OTP Configuration - 6 Digits

## Issue

Your frontend is now expecting **6-digit OTP codes** (to match Twilio), but Supabase Auth is configured to send **4-digit codes**.

## Solution: Configure Supabase for 6-Digit Codes

### Step 1: Update Supabase Auth Settings

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **Settings**
4. Under **Auth Providers** → **Phone**
5. Look for **"OTP Length"** or **"Token Length"** setting
6. Change from **4** to **6**
7. Click **Save**

### Step 2: Update Twilio Template (if using custom template)

If you have a custom Twilio message template:
1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Under SMS/Phone settings
3. Update the message template to accommodate 6 digits
4. Example: `Your verification code is: {{ .Token }}`

### Alternative: Keep 4 Digits

If you prefer to keep 4-digit codes (simpler for users):

**Option A: Configure Twilio for 4 digits**
- In your Twilio Verify service settings
- Set code length to 4 digits

**Option B: Revert frontend to 4 digits**
I can revert all the changes back to 4 digits if you prefer.

## Current Frontend Configuration

All screens now expect **6 digits**:
- ✅ Phone login: 6 digits
- ✅ Phone signup: 6 digits
- ✅ Email verification: 6 digits
- ✅ Profile security: 6 digits
- ✅ Profile communication: 6 digits

## What Happens Now

**Until you configure Supabase for 6 digits:**
- Users receive 4-digit codes
- Frontend expects 6 digits
- Verification will fail

**After configuring Supabase for 6 digits:**
- Users receive 6-digit codes
- Frontend expects 6 digits
- Verification works! ✅

## Recommendation

**6 digits is better for security** and is the industry standard. Most services (Google, GitHub, etc.) use 6-digit codes.

To fix immediately:
1. Update Supabase Auth settings to 6-digit OTP length
2. Test with a new verification code
3. Should work perfectly!

---

**Next Steps:**
1. Go to Supabase Dashboard
2. Update OTP length to 6
3. Test verification again

OR let me know if you want to keep 4 digits and I'll revert the frontend changes.

