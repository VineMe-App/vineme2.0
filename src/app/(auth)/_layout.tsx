import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="welcome"
        options={{
          title: 'Welcome',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="phone-login"
        options={{
          title: 'Phone Login',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="phone-signup"
        options={{
          title: 'Phone Sign Up',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="email-login"
        options={{
          title: 'Email Login',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="onboarding"
        options={{
          title: 'Onboarding',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="onboarding-loader"
        options={{
          title: 'Onboarding',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="verify-email"
        options={{
          title: 'Verify Email',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
