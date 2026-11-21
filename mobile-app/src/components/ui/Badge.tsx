import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { ListingCondition, ListingStatus } from '@/types/listing.types';

export type BadgeVariant =
  | 'verified'
  | 'status'
  | 'condition'
  | 'warning'
  | 'danger'
  | 'neutral';

export interface BadgeProps {
  variant?: BadgeVariant;
  label?: string;
  status?: ListingStatus;
  condition?: ListingCondition;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  label,
  status,
  condition,
  size = 'md',
  style,
}) => {
  const { colors, borderRadius } = useTheme();

  // Helper for Verified badge
  if (variant === 'verified') {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.verifiedBadgeBg,
            borderColor: colors.verifiedBadge,
            borderWidth: 1,
            borderRadius: borderRadius.full,
            paddingVertical: size === 'sm' ? 2 : 4,
            paddingHorizontal: size === 'sm' ? 6 : 8,
          },
          style,
        ]}
      >
        <Ionicons
          name="shield-checkmark"
          size={size === 'sm' ? 12 : 14}
          color={colors.verifiedBadge}
          style={{ marginRight: 4 }}
        />
        <Text
          style={[
            styles.text,
            {
              color: colors.verifiedBadge,
              fontSize: size === 'sm' ? 10 : 12,
              fontWeight: '700',
            },
          ]}
        >
          {label || 'NID Verified'}
        </Text>
      </View>
    );
  }

  // Helper for Condition badge
  if (condition) {
    const conditionConfig: Record<
      ListingCondition,
      { label: string; bg: string; color: string }
    > = {
      brand_new: { label: 'Brand New', bg: colors.primaryLight, color: colors.primaryDark },
      like_new: { label: 'Like New', bg: colors.secondaryLight, color: colors.secondaryDark },
      gently_used: { label: 'Gently Used', bg: colors.surfaceAlt, color: colors.textSecondary },
      heavily_used: { label: 'Heavily Used', bg: colors.warningLight, color: colors.warningDark },
    };
    const c = conditionConfig[condition] || conditionConfig.like_new;
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: c.bg,
            borderRadius: borderRadius.sm,
            paddingVertical: size === 'sm' ? 2 : 4,
            paddingHorizontal: size === 'sm' ? 6 : 8,
          },
          style,
        ]}
      >
        <Text style={[styles.text, { color: c.color, fontSize: size === 'sm' ? 11 : 12 }]}>
          {c.label}
        </Text>
      </View>
    );
  }

  // Helper for Status badge
  if (status) {
    const statusConfig: Record<
      ListingStatus,
      { label: string; bg: string; color: string }
    > = {
      active: { label: 'Active', bg: colors.primaryLight, color: colors.primaryDark },
      under_offer: { label: 'Reserved', bg: colors.warningLight, color: colors.warningDark },
      sold: { label: 'Sold', bg: colors.secondaryLight, color: colors.secondaryDark },
      expired: { label: 'Expired', bg: colors.surfaceAlt, color: colors.textMuted },
      archived: { label: 'Archived', bg: colors.surfaceAlt, color: colors.textMuted },
      draft: { label: 'Draft', bg: colors.surfaceAlt, color: colors.textSecondary },
      under_review: { label: 'Under Review', bg: colors.warningLight, color: colors.warningDark },
    };
    const s = statusConfig[status] || statusConfig.active;
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: s.bg,
            borderRadius: borderRadius.sm,
            paddingVertical: size === 'sm' ? 2 : 4,
            paddingHorizontal: size === 'sm' ? 6 : 8,
          },
          style,
        ]}
      >
        <Text style={[styles.text, { color: s.color, fontSize: size === 'sm' ? 11 : 12 }]}>
          {s.label}
        </Text>
      </View>
    );
  }

  // Generic badge fallback
  const getGenericColors = () => {
    switch (variant) {
      case 'warning':
        return { bg: colors.warningLight, color: colors.warningDark };
      case 'danger':
        return { bg: colors.dangerLight, color: colors.dangerDark };
      default:
        return { bg: colors.surfaceAlt, color: colors.textSecondary };
    }
  };

  const g = getGenericColors();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: g.bg,
          borderRadius: borderRadius.sm,
          paddingVertical: size === 'sm' ? 2 : 4,
          paddingHorizontal: size === 'sm' ? 6 : 8,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: g.color, fontSize: size === 'sm' ? 11 : 12 }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});
