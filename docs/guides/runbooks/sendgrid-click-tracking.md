# Fixing SendGrid Click Tracking URLs

## Problem

When Supabase sends emails through SendGrid, links are wrapped in tracking URLs like:
```
https://url4209.vineme.app/ls/click?upn=...
```

These tracking URLs can cause issues because:
1. They add an extra redirect step
2. They may not preserve all query parameters correctly
3. They can break deep linking to the app

## Solution Options

### Option 1: Disable Click Tracking in Supabase (Recommended)

1. Go to **Supabase Dashboard** → **Project Settings** → **Auth** → **Email Templates**
2. Find the email template being used (e.g., "Confirm signup")
3. Look for **Click Tracking** or **Link Tracking** settings
4. **Disable click tracking** for verification emails
5. This will make Supabase send direct links without SendGrid tracking

**Note:** You may need to check if this setting exists in your Supabase plan. Some plans may not allow disabling tracking.

### Option 2: Configure SendGrid Directly

If you have access to SendGrid settings:

1. Go to **SendGrid Dashboard** → **Settings** → **Tracking**
2. Disable **Click Tracking** for transactional emails
3. Or create a specific template that doesn't use click tracking

### Option 3: Use the Updated Redirect Page

The `verify-email.html` page has been updated to handle SendGrid tracking URLs by:
- Detecting when it's a tracking URL (checks for `upn` parameter)
- Waiting for SendGrid's redirect to complete
- Extracting the final destination URL
- Redirecting to the app with all parameters preserved

This should work, but Option 1 (disabling tracking) is cleaner and more reliable.

## Testing

After making changes:

1. Send a test verification email
2. Check the email link - it should either:
   - Go directly to `https://vineme.app/verify-email?access_token=...` (if tracking disabled)
   - Or go through the tracking URL and then redirect properly (if using Option 3)

3. The link should open the VineMe app with all parameters preserved

## Current Implementation

The `public/auth/verify-email.html` page now:
- Handles both direct links and SendGrid tracking URLs
- Extracts query parameters correctly
- Redirects to the app via deep link: `vineme://auth/verify-email?access_token=...&refresh_token=...`

## Additional Notes

- SendGrid tracking URLs are used for analytics but aren't necessary for email verification
- Disabling tracking may reduce analytics but improves reliability
- The redirect page will work either way, but direct links are faster and more reliable


