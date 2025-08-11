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

## Contributing

1. Follow the existing code style (enforced by ESLint and Prettier)
2. Use absolute imports with the `@/` prefix
3. Keep components small and focused
4. Write TypeScript interfaces for all data structures
5. Use React Query for server state management
6. Use Zustand for local UI state
