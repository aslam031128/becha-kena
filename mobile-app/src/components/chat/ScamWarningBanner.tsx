import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

export interface ScamWarningBannerProps {
  onDismiss?: () => void;
  customText?: string;
  variant?: 'danger' | 'warning';
  style?: ViewStyle;
}

export const ADVANCE_SCAM_KEYWORDS_REGEX = /(?:advance|bkash|b-kash|nagad|rocket|courier\s*fee|booking\s*fee|delivery\s*charge|delivery\s*fee|security\s*money|আগাম|বিকাশ|নগদ)/i;

export const PHISHING_LINK_REGEX = /(?:https?:\/\/|www\.|\.apk|\.xyz|\.top|\.ru)/i;

export function detectScamKeywords(text: string): boolean {
  return ADVANCE_SCAM_KEYWORDS_REGEX.test(text);
}

export function detectPhishingLinks(text: string): boolean {
  return PHISHING_LINK_REGEX.test(text);
}

export const ScamWarningBanner: React.FC<ScamWarningBannerProps> = ({
  onDismiss,
  customText,
  variant = 'danger',
  style,
}) => {
  const { colors, borderRadius } = useTheme();

  const isWarning = variant === 'warning';
  const bgColor = isWarning ? colors.warningLight : colors.scamWarningBg;
  const borderColor = isWarning ? colors.warning : colors.scamWarningBorder;
  const textColor = isWarning ? colors.warningDark : colors.scamWarningText;
  const iconColor = isWarning ? colors.warningDark : colors.danger;

  const defaultText =
    '⚠️ Warning: Never send advance money via bKash, Nagad, or courier booking fees before physically inspecting the product.';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderRadius: borderRadius.md,
        },
        style,
      ]}
    >
      <Ionicons name="warning" size={18} color={iconColor} style={styles.icon} />
      <Text style={[styles.text, { color: textColor }]}>
        {customText || defaultText}
      </Text>
      {onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.dismissBtn}
        >
          <Ionicons name="close" size={16} color={textColor} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    marginVertical: 4,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  dismissBtn: {
    marginLeft: 6,
    padding: 2,
  },
});
