import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { EmptyState, Button } from '@/components/ui';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function FavoritesScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ padding: spacing.lg }}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Saved Wishlist</Text>
        <EmptyState
          icon={<Ionicons name="heart-outline" size={48} color={colors.textMuted} />}
          title="No favorites saved"
          subtitle="Items you save will benchmark prices and send debounced push alerts upon price drops."
          actionTitle="Browse Marketplace"
          onAction={() => router.push('/(public)/search' as any)}
          style={{ marginTop: 40 }}
        />
        <Button
          title="Go Back"
          variant="secondary"
          onPress={() => router.back()}
          style={{ marginTop: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
});
