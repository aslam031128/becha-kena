import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  AppState,
  AppStateStatus,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Button, Card, Badge, Toast } from '@/components/ui';
import { kycApi } from '@/services/api/kyc.api';
import { useAuthStore } from '@/store/auth.store';
import { KycStatusResponse } from '@/types/kyc.types';
import { Ionicons } from '@expo/vector-icons';

export default function KycStatusScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const router = useRouter();
  const { setUser, user } = useAuthStore();

  const [statusData, setStatusData] = useState<KycStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const pollIntervalRef = useRef<any>(null);

  const fetchStatus = async () => {
    try {
      const response = await kycApi.getKycStatus();
      const data = response.data;
      setStatusData(data);

      if (data.isNidVerified || data.kycStatus === 'verified') {
        if (user) {
          setUser({ ...user, isNidVerified: true, kycStatus: 'verified' });
        }
        setToastMessage('Congratulations! Your identity has been verified.');
        setTimeout(() => {
          router.replace('/(tabs)/home' as any);
        }, 1500);
      }
    } catch (e) {
      console.warn('[KycStatus] Fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // 30-second foreground polling loop
    pollIntervalRef.current = setInterval(() => {
      fetchStatus();
    }, 30000);

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        fetchStatus();
      }
    });

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      subscription.remove();
    };
  }, []);

  const kycStatus = statusData?.kycStatus || 'manual_review';

  const getStatusIcon = () => {
    switch (kycStatus) {
      case 'verified':
        return { name: 'checkmark-circle' as const, color: colors.success };
      case 'retake_required':
        return { name: 'alert-circle' as const, color: colors.warning };
      case 'manual_review':
      default:
        return { name: 'time' as const, color: colors.secondary };
    }
  };

  const iconInfo = getStatusIcon();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
        {toastMessage && (
          <Toast
            visible={!!toastMessage}
            message={toastMessage}
            variant="success"
            onDismiss={() => setToastMessage(null)}
          />
        )}

        {/* Status Emblem Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor:
                  kycStatus === 'verified'
                    ? colors.successLight
                    : kycStatus === 'retake_required'
                    ? colors.warningLight
                    : colors.secondaryLight,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            <Ionicons name={iconInfo.name} size={48} color={iconInfo.color} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {kycStatus === 'verified'
              ? 'Identity Verified!'
              : kycStatus === 'retake_required'
              ? 'Verification Needs Attention'
              : 'Identity Under Manual Review'}
          </Text>

          <Badge
            variant={kycStatus === 'verified' ? 'verified' : 'status'}
            status={kycStatus === 'verified' ? 'active' : 'under_review'}
            label={
              kycStatus === 'verified'
                ? 'NID Verified Citizen'
                : kycStatus === 'retake_required'
                ? 'Action Required'
                : 'Queue SLA < 4 Hours'
            }
            style={{ marginTop: 8 }}
          />
        </View>

        {/* Detailed Status Card */}
        <Card style={styles.detailsCard}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Review Pipeline Details
          </Text>

          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
              Estimated Resolution:
            </Text>
            <Text style={[styles.metaValue, { color: colors.primary }]}>
              Within {statusData?.slaRemainingMinutes ?? 180} minutes
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
              Queue Operating Hours:
            </Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
              {statusData?.slaWorkingHours || '9:00 AM – 9:00 PM BST'}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
              Automated Tries Used:
            </Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
              {statusData?.attemptsUsed ?? 3} of 3 attempts
            </Text>
          </View>

          {statusData?.rejectionReason && (
            <View style={[styles.reasonBox, { backgroundColor: colors.warningLight }]}>
              <Text style={[styles.reasonTitle, { color: colors.warningDark }]}>
                Reviewer Notes:
              </Text>
              <Text style={[styles.reasonText, { color: colors.warningDark }]}>
                {statusData.rejectionReason}
              </Text>
            </View>
          )}
        </Card>

        {/* Actions */}
        {kycStatus === 'retake_required' ? (
          <Button
            title="Retake Document & Selfie Verification"
            variant="primary"
            size="lg"
            onPress={() => router.replace('/(auth)/kyc' as any)}
            style={{ marginTop: 16 }}
            fullWidth
          />
        ) : (
          <Button
            title="Refresh Status Now"
            variant="primary"
            size="lg"
            onPress={fetchStatus}
            loading={isLoading}
            style={{ marginTop: 16 }}
            fullWidth
          />
        )}

        <Button
          title="Return to Marketplace Feed"
          variant="ghost"
          onPress={() => router.replace('/(public)' as any)}
          style={{ marginTop: 12 }}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  iconCircle: {
    width: 88,
    height: 88,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  detailsCard: {
    padding: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  metaLabel: {
    fontSize: 13,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  reasonBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 8,
  },
  reasonTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
