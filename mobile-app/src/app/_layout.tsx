import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '@/store/auth.store';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';

// Keep native splash screen visible while fonts and credentials hydrate
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const checkAuthState = useAuthStore((state) => state.checkAuthState);

  // Activate global route protection
  useProtectedRoute();

  useEffect(() => {
    async function prepare() {
      try {
        await checkAuthState();
      } catch (e) {
        console.warn('[RootLayout] Error during startup prepare:', e);
      } finally {
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
