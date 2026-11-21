import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Button, Card, Badge } from '@/components/ui';
import { useRouter } from 'expo-router';

export default function SellerDashboardScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ padding: spacing.lg }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Seller Hub</Text>
          <Badge variant="status" status="active" label="Quota: 0/5 Active" />
        </View>

        <Card style={{ marginTop: 20 }}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Post Your Pre-Owned Items
          </Text>
          <Text style={{ color: colors.textSecondary, marginVertical: 8, lineHeight: 20 }}>
            Every citizen can maintain up to 5 active C2C listings each rolling 30-day window.
          </Text>
          <Button
            title="Post a New Ad"
            variant="primary"
            onPress={() => router.push('/(tabs)/sell/create' as any)}
            style={{ marginTop: 8 }}
            fullWidth
          />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
});
