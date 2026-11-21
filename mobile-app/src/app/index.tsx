import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/theme';

export default function EntryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isAuthenticated, isNidVerified, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      if (!isNidVerified) {
        // If logged in but not yet NID verified, navigate to KYC onboarding
        router.replace('/(auth)/kyc' as any);
      } else {
        router.replace('/(tabs)/home' as any);
      }
    } else {
      // Unauthenticated visitors enter public discovery catalog
      router.replace('/(public)' as any);
    }
  }, [isAuthenticated, isNidVerified, isLoading]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
