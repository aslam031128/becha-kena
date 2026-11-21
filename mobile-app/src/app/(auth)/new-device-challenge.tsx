import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Button, Card, Badge } from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';

export default function NewDeviceChallengeScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ padding: spacing.xl }}>
        <View style={styles.header}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.warningLight, borderRadius: borderRadius.full },
            ]}
          >
            <Ionicons name="phone-portrait" size={36} color={colors.warningDark} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            New Device Security Challenge
          </Text>
          <Badge variant="warning" label="Hardware Footprint Guard" style={{ marginTop: 8 }} />
        </View>

        <Card style={{ marginVertical: 20 }}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            SIM & Biometric Authorization Required
          </Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 22, marginTop: 8 }}>
            Our system detected a login from an unrecognized device using your registered SIM.
            To protect your account against physical SIM-swap fraud, a fast 3-second biometric selfie confirmation is required.
          </Text>
        </Card>

        <Button
          title="Proceed to Biometric Selfie"
          variant="primary"
          size="lg"
          onPress={() => router.replace('/(auth)/kyc' as any)}
          fullWidth
        />

        <Button
          title="Cancel and Sign Out"
          variant="ghost"
          onPress={() => router.replace('/(auth)/login' as any)}
          style={{ marginTop: 12 }}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
});
