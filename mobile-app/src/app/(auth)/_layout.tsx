import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="kyc" options={{ headerShown: false }} />
      <Stack.Screen name="kyc-status" options={{ headerShown: false }} />
      <Stack.Screen name="recover-account" options={{ headerShown: false }} />
      <Stack.Screen name="new-device-challenge" options={{ headerShown: false }} />
    </Stack>
  );
}
