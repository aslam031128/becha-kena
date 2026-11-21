import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';

export interface ListingCardSkeletonProps {
  style?: ViewStyle;
}

export const ListingCardSkeleton: React.FC<ListingCardSkeletonProps> = ({ style }) => {
  const { colors, spacing, borderRadius } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
        },
        style,
      ]}
    >
      {/* Thumbnail placeholder */}
      <Skeleton width={100} height={100} borderRadius={borderRadius.md} />

      {/* Info placeholder */}
      <View style={styles.infoCol}>
        <Skeleton width="85%" height={16} />
        <Skeleton width="60%" height={14} style={{ marginTop: 6 }} />

        <View style={styles.row}>
          <Skeleton width="45%" height={18} />
          <Skeleton width="30%" height={18} borderRadius={10} />
        </View>

        <Skeleton width="70%" height={12} style={{ marginTop: 4 }} />

        <View style={[styles.row, { marginTop: 8 }]}>
          <Skeleton width={20} height={20} borderRadius={10} />
          <Skeleton width="50%" height={12} style={{ marginLeft: 6 }} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    marginVertical: 6,
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
