# Supabase Edge Functions

This directory contains Supabase Edge Functions for the VineMe application.

## Functions

### `delete-auth-user`

Automatically deletes Supabase Auth users when their database records are deleted.

**Trigger:** Database webhook on `users` table DELETE event

**Purpose:** Complete account cleanup by removing both database record AND auth identity

**Setup:** See `SUPABASE_WEBHOOK_SETUP.md` in the root directory for complete instructions

## Deployment

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy delete-auth-user
```

## Local Development

```bash
# Serve functions locally
supabase functions serve

# Test function locally
supabase functions invoke delete-auth-user \
  --data '{"record":{"id":"test-user-id"}}'
```

## Environment Variables

Functions use these secrets (set via `supabase secrets set`):

- `SUPABASE_URL` - Auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Required for admin operations

## Monitoring

```bash
# View logs
supabase functions logs delete-auth-user

# Follow logs in real-time
supabase functions logs delete-auth-user --follow

# View stats
supabase functions stats delete-auth-user
```

