import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { EmptyState, Button } from '@/components/ui';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function DealsScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ padding: spacing.lg }}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Deals & Reputation</Text>
        <EmptyState
          icon={<Ionicons name="receipt-outline" size={48} color={colors.textMuted} />}
          title="No completed transactions"
          subtitle="Closed deals unlock mutual bilateral review privileges and post-deal stolen gadget protection."
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
