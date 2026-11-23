# Universal/App Links host files

Host these exact files at your domain so iOS and Android verify links and open the app when installed.

## iOS: apple-app-site-association (AASA)
Place at:
- https://vineme.app/.well-known/apple-app-site-association

Content (no extension, served as application/json):

```
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
          "*"
        ]
      }
    ]
  }
}
```

Replace <TEAMID> with your Apple Developer Team ID.

## Android: assetlinks.json
Place at:
- https://vineme.app/.well-known/assetlinks.json

Content:

```
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

Replace <SHA256_OF_SIGNING_CERT> with your app signing cert’s SHA-256. For EAS builds, use the fingerprint from the Play Console or `eas credentials` output.

## Notes
- After hosting, give it a few minutes and reinstall the app (device, not simulator). iOS often needs a fresh install to pick up AASA.
- Android autoVerify runs on install; you can also check with `adb shell pm get-app-links com.vineme.app`.
- While developing, the links will open the app only if the files are reachable over HTTPS without redirects and with the correct content type.
