# VineMe Mobile App

A cross-platform mobile application built with Expo and React Native to help church members connect with their community through Bible study groups and events.

## Getting Started

### Prerequisites

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
