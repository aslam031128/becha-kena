import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface SafetyGuidelinesModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SafetyGuidelinesModal: React.FC<SafetyGuidelinesModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, spacing, borderRadius } = useTheme();

  const rules = [
    {
      icon: 'sunny' as const,
      title: 'Meet in Daylight in Public Places',
      desc: 'Choose busy, well-lit public spots such as shopping malls, metro station exits, or bank lobbies.',
    },
    {
      icon: 'search' as const,
      title: 'Inspect the Product Thoroughly',
      desc: 'Verify device serial numbers, battery health, accessories, and functionality before agreeing to pay.',
    },
    {
      icon: 'close-circle' as const,
      title: 'Zero Advance Payments',
      desc: 'NEVER send booking fees or courier advance tokens via bKash, Nagad, or Rocket. Legitimate sellers will never demand advance booking money.',
    },
    {
      icon: 'people' as const,
      title: 'Bring a Friend',
      desc: 'Whenever meeting in an unfamiliar area, bring a companion with you for extra peace of mind.',
    },
    {
      icon: 'cash' as const,
      title: 'Direct Hand-to-Hand Settlement',
      desc: 'Pay cash or instant mobile banking transfer only after holding the item and being 100% satisfied.',
    },
  ];

  return (
    <Modal visible={visible} onClose={onClose} title="Safe Trading Best Practices">
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {rules.map((rule, idx) => (
            <View
              key={idx}
              style={[
                styles.ruleCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: colors.primaryLight,
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <Ionicons name={rule.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.textWrap}>
                <Text style={[styles.ruleTitle, { color: colors.textPrimary }]}>
                  {rule.title}
                </Text>
                <Text style={[styles.ruleDesc, { color: colors.textSecondary }]}>
                  {rule.desc}
                </Text>
              </View>
            </View>
          ))}

          <Button
            title="I Understand"
            variant="primary"
            onPress={onClose}
            style={{ marginTop: spacing.md }}
            fullWidth
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 460,
  },
  container: {
    paddingVertical: 4,
  },
  ruleCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  ruleDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
});
