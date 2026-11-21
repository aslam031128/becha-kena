import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface PhoneRevealModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmReveal: () => void;
  revealsRemainingToday: number;
  isLoading: boolean;
  onOpenChat?: () => void;
}

export const PhoneRevealModal: React.FC<PhoneRevealModalProps> = ({
  visible,
  onClose,
  onConfirmReveal,
  revealsRemainingToday,
  isLoading,
  onOpenChat,
}) => {
  const { colors, spacing, borderRadius } = useTheme();

  const isLimitReached = revealsRemainingToday <= 0;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isLimitReached ? 'Daily Limit Reached' : 'Reveal Contact Number'}
    >
      <View style={styles.container}>
        {/* Icon */}
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isLimitReached ? colors.warningLight : colors.primaryLight,
            },
          ]}
        >
          <Ionicons
            name={isLimitReached ? 'time-outline' : 'call-outline'}
            size={32}
            color={isLimitReached ? colors.warningDark : colors.primary}
          />
        </View>

        {isLimitReached ? (
          <>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Daily Reveal Quota Exhausted
            </Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              You have reached your daily limit of 10 seller phone reveals per 24 hours. This measure prevents citizen harassment and spam.
            </Text>
            <View
              style={[
                styles.noticeBox,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Ionicons name="chatbubbles" size={18} color={colors.primary} />
              <Text style={[styles.noticeText, { color: colors.textPrimary }]}>
                You can still communicate securely in real-time via in-app chat!
              </Text>
            </View>

            {onOpenChat && (
              <Button
                title="Open In-App Chat"
                variant="primary"
                onPress={() => {
                  onClose();
                  onOpenChat();
                }}
                style={{ marginTop: spacing.md }}
                fullWidth
              />
            )}

            <Button
              title="Close"
              variant="secondary"
              onPress={onClose}
              style={{ marginTop: spacing.xs }}
              fullWidth
            />
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Reveal Seller Contact Number?
            </Text>

            {/* Quota Counter */}
            <View
              style={[
                styles.quotaChip,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary,
                  borderRadius: borderRadius.full,
                },
              ]}
            >
              <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
              <Text style={[styles.quotaText, { color: colors.primary }]}>
                {revealsRemainingToday} reveals remaining today (limit: 10/day)
              </Text>
            </View>

            {/* Anti-Scam Warning Box */}
            <View
              style={[
                styles.scamBox,
                {
                  backgroundColor: colors.scamWarningBg,
                  borderColor: colors.scamWarningBorder,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Ionicons name="warning" size={20} color={colors.danger} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.scamTitle, { color: colors.scamWarningText }]}>
                  Anti-Scam Safety Notice
                </Text>
                <Text style={[styles.scamBody, { color: colors.scamWarningText }]}>
                  Never send advance token money via bKash or Nagad. Always meet in a public location and verify the product condition before payment.
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <Button
              title="Reveal & Call Now"
              variant="primary"
              size="lg"
              loading={isLoading}
              onPress={onConfirmReveal}
              style={{ marginTop: spacing.md }}
              fullWidth
            />

            <Button
              title="Cancel"
              variant="ghost"
              onPress={onClose}
              disabled={isLoading}
              style={{ marginTop: spacing.xs }}
              fullWidth
            />
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  quotaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    marginBottom: 14,
    gap: 6,
  },
  quotaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginVertical: 10,
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  scamBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderWidth: 1,
  },
  scamTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  scamBody: {
    fontSize: 11,
    lineHeight: 16,
  },
});
