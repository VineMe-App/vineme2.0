# Email Verification Hosting Setup

This guide explains how to set up the HTTPS redirect page for email verification so that email links work reliably across all email clients.

## Overview

When users click the verification link in their email, it needs to:
1. Open in a browser first (HTTPS URL)
2. Redirect to the VineMe app via deep link
3. Pass authentication tokens to the app

## Required Files

You need to host the following files on your domain:

### 1. Email Verification Redirect Page
**Location:** `https://vineme.app/auth/verify-email.html` (or `verify-email` without extension if your server supports it)

**File:** `public/auth/verify-email.html` (included in this repo)

This page:
- Extracts query parameters from the URL (tokens, redirect path, email)
- Redirects to the app via deep link: `vineme://auth/verify-email?access_token=...&refresh_token=...`
- Shows a loading spinner while redirecting
- Provides fallback instructions if the app doesn't open

### 2. Universal Link Verification Files

#### iOS: `apple-app-site-association`
**Location:** `https://vineme.app/.well-known/apple-app-site-association`

**Content:**
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "FL6V626V95.com.vineme.app",
        "paths": [
          "/group/*",
          "/event/*",
          "/referral/*",
          "/notifications",
          "/auth/*",
          "*"
        ]
      }
    ]
  }
}
```

**Important:**
- Must be served with `Content-Type: application/json`
- Must be accessible over HTTPS without redirects
- No file extension (just `apple-app-site-association`)
- Must return 200 status code

#### Android: `assetlinks.json`
**Location:** `https://vineme.app/.well-known/assetlinks.json`

**Content:**
```json
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "com.vineme.app",
      "sha256_cert_fingerprints": [
        "<SHA256_OF_SIGNING_CERT>"
      ]
    }
  }
]
```

**Important:**
- Replace `<SHA256_OF_SIGNING_CERT>` with your app's signing certificate SHA-256
- For EAS builds, get this from Play Console or `eas credentials` output
- Must be served with `Content-Type: application/json`
- Must be accessible over HTTPS without redirects

## Hosting Options

### Option 1: GoDaddy (or any web hosting)

1. **Upload files via FTP or File Manager:**
   - Upload `public/auth/verify-email.html` to `public_html/auth/verify-email.html`
   - Create `.well-known` directory in `public_html`
   - Upload `apple-app-site-association` and `assetlinks.json` to `public_html/.well-known/`

2. **Configure MIME types:**
   - Ensure `.well-known/apple-app-site-association` is served as `application/json`
   - Ensure `.well-known/assetlinks.json` is served as `application/json`
   - This may require adding to `.htaccess` (Apache) or server config

3. **Test accessibility:**
   - Visit `https://vineme.app/.well-known/apple-app-site-association` - should return JSON
   - Visit `https://vineme.app/.well-known/assetlinks.json` - should return JSON
   - Visit `https://vineme.app/auth/verify-email` - should show redirect page

### Option 2: Netlify (Recommended - Free & Easy)

1. **Create a `netlify.toml` in your project root:**
```toml
[[redirects]]
  from = "/auth/verify-email"
  to = "/auth/verify-email.html"
  status = 200

[[headers]]
  for = "/.well-known/apple-app-site-association"
  [headers.values]
    Content-Type = "application/json"

[[headers]]
  for = "/.well-known/assetlinks.json"
  [headers.values]
    Content-Type = "application/json"
```

2. **Deploy:**
   - Connect your repo to Netlify
   - Set build command: `echo "No build needed"`
   - Set publish directory: `public`
   - Deploy

3. **Configure custom domain:**
   - Add `vineme.app` as a custom domain in Netlify
   - Update DNS records as instructed by Netlify

### Option 3: Vercel (Similar to Netlify)

1. **Create a `vercel.json` in your project root:**
```json
{
  "routes": [
    {
      "src": "/auth/verify-email",
      "dest": "/auth/verify-email.html"
    }
  ],
  "headers": [
    {
      "source": "/.well-known/apple-app-site-association",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    {
      "source": "/.well-known/assetlinks.json",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/json"
        }
      ]
    }
  ]
}
```

2. **Deploy and configure domain similarly to Netlify**

## Supabase Configuration

After hosting the files, configure Supabase:

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   - `https://vineme.app/auth/verify-email`
   - `https://www.vineme.app/auth/verify-email` (if using www subdomain)
3. Save changes

## Testing

1. **Test universal links:**
   ```bash
   # iOS - should return JSON
   curl https://vineme.app/.well-known/apple-app-site-association
   
   # Android - should return JSON
   curl https://vineme.app/.well-known/assetlinks.json
   ```

2. **Test redirect page:**
   - Visit `https://vineme.app/auth/verify-email?access_token=test&refresh_token=test&redirect=/profile/communication&email=test@example.com`
   - Should show loading spinner and attempt to open app

3. **Test email verification:**
   - Send a test verification email from the app
   - Click the link in the email
   - Should open browser, then redirect to app

## Troubleshooting

### "Page not found" in Safari
- Ensure the redirect page is hosted at the correct URL
- Check that DNS is properly configured
- Verify HTTPS is working (not redirecting to HTTP)

### App doesn't open from email link
- Verify universal link files are accessible
- Check that paths include `/auth/*` in `apple-app-site-association`
- Ensure app is installed on the device
- Try reinstalling the app after hosting files

### Universal links not working
- Files must be served with correct Content-Type
- No redirects allowed (must be direct 200 response)
- Wait a few minutes after hosting (DNS propagation)
- Reinstall app after hosting files (iOS requirement)

## Notes

- The redirect page uses JavaScript to extract query parameters and redirect to the app
- If JavaScript is disabled, users can manually tap the "Open VineMe App" button
- The deep link format `vineme://auth/verify-email` is handled by the app's deep link handler
- All query parameters are preserved when redirecting to the app


