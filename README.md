# VineMe Mobile App

A cross-platform mobile application built with Expo and React Native to help church members connect with their community through Bible study groups and events.

## Getting Started

### Prerequisites please LORD!


- Node.js (v18 or later)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the environment variables:

   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Development

Start the development server:

```bash
npm start
```

Run on specific platforms:

```bash
npm run ios     # iOS simulator
npm run android # Android emulator
npm run web     # Web browser
```

### Code Quality

Run linting:

```bash
npm run lint        # Check for linting errors
npm run lint:fix    # Fix linting errors automatically
```

Run formatting:

```bash
npm run format        # Format code with Prettier
npm run format:check  # Check if code is formatted
```

## Project Structure

```
src/
├── app/                    # Expo Router pages
├── components/            # Reusable UI components
├── services/             # Data access layer (Supabase)
├── stores/               # Zustand stores
├── types/                # TypeScript type definitions
├── utils/                # Utility functions
├── hooks/                # Custom React hooks
└── providers/            # React context providers
```

## Technology Stack

- **Framework**: Expo (managed workflow) with TypeScript
- **Navigation**: Expo Router
- **State Management**: React Query + Zustand
- **Backend**: Supabase
- **Styling**: React Native StyleSheet
- **Code Quality**: ESLint + Prettier

## Environment Variables

The app uses the following environment variables:

- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

Additional (optional / feature‑specific):

- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`: Google Maps key for `react-native-maps` (required on Android/iOS builds)
- `EXPO_PUBLIC_MAPBOX_TOKEN`: Mapbox token for geocoding fallback
- `GOOGLE_SERVICES_JSON`: Path to `google-services.json` (Android FCM) — provided to EAS as a file env

### Runtime vs Build‑Time Config (Important)

- Runtime (JS): `EXPO_PUBLIC_*` vars are inlined into the JavaScript bundle by Metro/Expo. They work from a local `.env` without rebuilding native code. Examples: Supabase URL/Anon Key, Mapbox token.
- Build‑time (native): Values that end up in native manifests must be present during the native build (dev client or release), typically via EAS env/secrets. Examples:
  - Google Maps (Android/iOS) → `app.config.ts` uses `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` to write `AndroidManifest.xml` and iOS config; requires rebuild.
  - FCM (Android) → `google-services.json` must be provided to the builder and the app rebuilt.

Provide build‑time secrets to EAS:

```bash
# Google Maps API key (string secret)
eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "YOUR_KEY"

# FCM google-services.json (file secret)
eas secret:create --name GOOGLE_SERVICES_JSON --type file --src ./google-services.json
```

Rebuild the dev client after setting secrets:

```bash
eas build --profile development --platform android
eas build --profile development --platform ios
```

Notes:

- Local `.env` is not visible to EAS remote builds unless copied into the profile’s `env` or stored as secrets.
- Expo Go cannot inject native config (e.g., Maps API key, FCM); use a custom dev client.

## Developer Tools

- In development, a DevTools overlay is available (floating 🐞 button):
  - State: shows user/profile and current `expo-router` segments
  - Logs: buffers `console.*` output in‑app
  - Errors: shows errors captured by the global error handler
  - Queries: lists React Query cache entries
  - Notifs: manage notifications (request permissions, get token, send local test, send Expo test)

Notifications tips:

- Local notifications work without FCM.
- Expo push tokens on Android require a dev client built with a valid `google-services.json`.
- Send a quick remote test using the Notifs tab → “Send Expo Test” (uses the Expo Push API).

## Running on a physical Android device over USB (ADB)

If you prefer a stable connection without relying on Wi‑Fi/tunnels, you can forward the Metro port over USB.

Prerequisites:

- Enable Developer Options and USB debugging on your Android device.
- Install Android Platform Tools (adb) and ensure it is on your PATH.
- Connect the device via USB and trust the computer.

Steps:

1. Verify adb sees your device:

   ```bash
   adb devices
   # should list your device as 'device' (not 'unauthorized')
   ```

2. Reverse-forward Metro (React Native bundler) port 8081 from device → host:

   ```bash
   adb reverse tcp:8081 tcp:8081
   ```

3. Start Expo with your environment variables (only needed if not auto-loaded):

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=YOUR_URL \
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_KEY \
   npx expo start --dev-client -c
   ```

   If your project loads `.env` automatically, you can omit the prefixes:

   ```bash
   npx expo start --dev-client -c
   ```

4. Open your development build (Expo Dev Client) on the device and tap “Open from QR/URL”. Because of adb reverse, it can load `exp://127.0.0.1:8081` (Expo will usually resolve this automatically when you scan the QR from the terminal/web UI).

Notes:

- Use `--dev-client` for custom dev clients. For Expo Go, you don’t need adb reverse, but LAN/tunnel must be reachable.
- If you change networks or unplug the device, re-run `adb reverse tcp:8081 tcp:8081`.
- For iOS, use the simulator or a dev client over Wi‑Fi; USB port forwarding is not available like adb.

## Contributing

1. Follow the existing code style (enforced by ESLint and Prettier)
2. Use absolute imports with the `@/` prefix
3. Keep components small and focused
4. Write TypeScript interfaces for all data structures
5. Use React Query for server state management
6. Use Zustand for local UI state
