# Mobile app (`apps/mobile`, Expo)

Everything in the app bundle (JS, `app.config.ts` `extra`, `EXPO_PUBLIC_*`, assets) is readable by anyone who downloads the app. The app is a client like any other: the server must enforce everything.

- [ ] Supabase session tokens are stored in `expo-secure-store` (or encrypted), not plain `AsyncStorage`. If tokens are too large for SecureStore, check the chosen workaround still keeps the refresh token protected.
- [ ] Other sensitive cached data (contact details, notes, query cache persistence) isn't written unencrypted to device storage longer than needed, and is cleared on sign-out.
- [ ] No service-role key, third-party secret or admin-only endpoint secret is in the bundle or `eas.json`.
- [ ] Admin or leader screens in the app don't rely on hiding UI; the services they call are protected server-side.
- [ ] Deep links and Expo Router routes validate parameters, and links that sign in or accept invites can't be replayed or hijacked by another app (prefer universal/app links over custom schemes for auth).
- [ ] Push notification payloads don't include personal or safeguarding details that show on a locked screen; push tokens are tied to the user and removed on sign-out.
- [ ] OTA updates (EAS Update) come only from the project's own channels; check who can publish to production channels.
- [ ] Logs, Sentry and analytics from the app follow the rules in `KEYS-AND-SECRETS.md`.
- [ ] Network: no cleartext HTTP or disabled TLS checks in production config (`ios/` Info.plist ATS, Android network security config, config plugins).
- [ ] Location features ask only when needed and don't send precise location where an area is enough.
