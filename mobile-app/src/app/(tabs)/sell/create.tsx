import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Button, Input } from '@/components/ui';

export default function CreateListingScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ padding: spacing.lg }}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Create New Listing</Text>
        <Text style={{ color: colors.textSecondary, marginVertical: 8 }}>
          Multi-step photo uploader, condition specification, and division selection will be expanded in Phase 8.
        </Text>
        <Input label="Item Title" placeholder="e.g. Sony WH-1000XM4 Headphones" />
        <Button
          title="Back to Dashboard"
          variant="secondary"
          onPress={() => router.back()}
          style={{ marginTop: 16 }}
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
    fontSize: 20,
    fontWeight: '700',
  },
});
