# Supabase Webhook Setup for Auth User Deletion

This guide explains how to set up a webhook that automatically deletes Supabase Auth users when their database records are deleted.

## 📋 Overview

When a user deletes their account:
1. App calls `delete_my_account()` RPC
2. RPC deletes user from `users` table
3. Database webhook triggers
4. Edge Function deletes auth user
5. Complete cleanup! ✅

## 🚀 Setup Steps

### Step 1: Install Supabase CLI

If you haven't already:

```bash
# macOS
brew install supabase/tap/supabase

# Or using npm
npm install -g supabase
```

### Step 2: Link Your Project

```bash
# Navigate to your project
cd /Users/tofunmionaeko/Documents/vineme2.0-1

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

**To find your project ref:**
1. Go to Supabase Dashboard
2. Click on your project
3. Go to Settings → General
4. Copy the "Reference ID"

### Step 3: Deploy the Edge Function

```bash
# Deploy the function
supabase functions deploy delete-auth-user

# Or deploy all functions
supabase functions deploy
```

### Step 4: Set Environment Variables

The function needs access to your service role key:

```bash
# Set the service role key (found in Settings → API)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 5: Create Database Webhook

1. **Go to Supabase Dashboard**
2. **Navigate to:** Database → Webhooks
3. **Click:** "Create a new hook"

**Configure the webhook:**

| Field | Value |
|-------|-------|
| **Name** | `delete-auth-user-on-delete` |
| **Table** | `users` |
| **Events** | ✅ Delete |
| **Type** | `HTTP Request` |
| **Method** | `POST` |
| **URL** | `https://YOUR_PROJECT_REF.supabase.co/functions/v1/delete-auth-user` |
| **HTTP Headers** | Add header: `Authorization` = `Bearer YOUR_ANON_KEY` |

**To get your Function URL:**
```
https://[YOUR_PROJECT_REF].supabase.co/functions/v1/delete-auth-user
```

**To get your Anon Key:**
- Settings → API → Project API keys → `anon` `public`

4. **Click:** "Create webhook"

### Step 6: Test the Webhook

#### Option A: Test via Dashboard

1. Go to Database → Webhooks
2. Click on your webhook
3. Click "Send test request"
4. Check the logs to verify it works

#### Option B: Test via Function

```bash
# Invoke the function directly
supabase functions invoke delete-auth-user \
  --data '{"record":{"id":"test-user-id"}}'
```

#### Option C: Test via Actual Deletion

1. Create a test user account in your app
2. Try to delete the account
3. Check Supabase Auth users to verify deletion

## 🔍 Verification

### Check if Function is Deployed

```bash
# List all functions
supabase functions list
```

You should see `delete-auth-user` in the list.

### Check Function Logs

```bash
# View function logs
supabase functions logs delete-auth-user

# Or follow logs in real-time
supabase functions logs delete-auth-user --follow
```

### Verify Webhook is Active

1. Go to Database → Webhooks
2. Your webhook should show status: **Active**
3. Click on it to see recent invocations

## 🐛 Troubleshooting

### Function not found (404)

**Problem:** URL is incorrect or function not deployed

**Solution:**
```bash
# Redeploy the function
supabase functions deploy delete-auth-user

# Verify it's deployed
supabase functions list
```

### Authentication error (401)

**Problem:** Wrong anon key or missing Authorization header

**Solution:**
- Check the Authorization header in webhook config
- Format: `Bearer YOUR_ANON_KEY`
- Get fresh anon key from Settings → API

### Service role key not set (500)

**Problem:** Missing SUPABASE_SERVICE_ROLE_KEY environment variable

**Solution:**
```bash
# Set the secret
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key

# Redeploy function
supabase functions deploy delete-auth-user
```

### Webhook not triggering

**Problem:** Webhook configuration issue

**Solution:**
1. Check webhook is enabled (Active status)
2. Verify table name is exactly `users`
3. Ensure "Delete" event is checked
4. Try clicking "Send test request"

### Function throws error but webhook succeeds

**Problem:** Error in function logic

**Solution:**
1. Check function logs: `supabase functions logs delete-auth-user`
2. Look for error messages
3. Common issues:
   - User ID not found in payload
   - Auth user already deleted
   - Service role key expired

## 📊 Monitoring

### View Recent Webhook Invocations

1. Go to Database → Webhooks
2. Click on your webhook
3. See list of recent invocations with status codes

### View Function Metrics

```bash
# View function stats
supabase functions stats delete-auth-user
```

### Set Up Alerts (Optional)

Consider setting up monitoring to alert you if:
- Function fails multiple times
- Webhook stops triggering
- Auth users pile up without deletion

## 🔒 Security Notes

- ✅ Edge Function uses service role key (full admin access)
- ✅ Webhook requires anon key (basic authentication)
- ✅ Function only accepts POST requests
- ✅ CORS configured for security
- ⚠️ Keep service role key secret (never commit to git)

## 📝 Alternative: Database Trigger (Advanced)

If you prefer a pure SQL solution without Edge Functions:

```sql
-- Note: This requires additional setup and may have limitations
-- Edge Functions are the recommended approach

create or replace function delete_auth_user_trigger()
returns trigger
language plpgsql
security definer
as $$
begin
  -- This would require a way to call Supabase Auth API from SQL
  -- Not directly supported, so Edge Functions are better
  return old;
end;
$$;

-- Not recommended: SQL can't directly call Auth API
```

## 🎯 Complete Flow

```
User deletes account
    ↓
App calls delete_my_account() RPC
    ↓
Checks if sole leader (blocks if true)
    ↓
Deletes from users table
    ├─ Cascades: memberships, friendships, etc.
    └─ Triggers: Database webhook
        ↓
        Webhook calls Edge Function
        ↓
        Edge Function deletes Auth user
        ↓
        Complete cleanup! ✅
```

## 💾 Backup & Recovery

### If Something Goes Wrong

The function is idempotent - safe to retry:
- If auth user already deleted: Returns success
- If user ID invalid: Logs error but doesn't crash

### Manual Cleanup

If webhook fails, you can manually delete auth users:

```typescript
// In Supabase Dashboard → SQL Editor
-- Find orphaned auth users (auth users without database record)
-- Then manually delete them via Auth → Users
```

## 📚 Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Database Webhooks Docs](https://supabase.com/docs/guides/database/webhooks)
- [Supabase Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)

## ✅ Checklist

- [ ] Supabase CLI installed
- [ ] Project linked via CLI
- [ ] Edge Function deployed
- [ ] Service role key set as secret
- [ ] Database webhook created
- [ ] Webhook tested successfully
- [ ] Function logs show no errors
- [ ] Test account deletion works end-to-end

## 🎉 Done!

Your auth cleanup is now automated. When users delete their accounts, both the database record AND the auth identity will be removed completely.

