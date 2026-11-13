# Universal Link Verification Files

These files need to be hosted at your domain root under `/.well-known/`:

- `apple-app-site-association` - For iOS universal links
- `assetlinks.json` - For Android app links

## Important Notes

1. **Content-Type**: Both files must be served with `Content-Type: application/json`
2. **No redirects**: Files must be accessible directly (200 status) without redirects
3. **HTTPS only**: Must be served over HTTPS
4. **No file extension**: `apple-app-site-association` should not have a `.json` extension

## Setup Instructions

See `docs/email-verification-hosting-setup.md` for complete setup instructions.

## Android Certificate Fingerprint

Replace `<SHA256_OF_SIGNING_CERT>` in `assetlinks.json` with your app's signing certificate SHA-256 fingerprint.

To get the fingerprint:
- For EAS builds: Check Play Console or run `eas credentials`
- For local builds: Use `keytool -list -v -keystore <keystore>`


