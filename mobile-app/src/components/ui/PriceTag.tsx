import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

export interface PriceTagProps {
  price: number;
  originalPrice?: number;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const PriceTag: React.FC<PriceTagProps> = ({
  price,
  originalPrice,
  size = 'md',
  style,
}) => {
  const { colors, borderRadius } = useTheme();

  // Format currency with standard thousands separators
  const formatBDT = (amount: number) => {
    return `BDT ${amount.toLocaleString('en-US')}`;
  };

  const fontSizes = {
    sm: 14,
    md: 18,
    lg: 24,
  }[size];

  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <View style={[styles.container, style]}>
      <Text
        style={[
          styles.priceText,
          {
            color: colors.primary,
            fontSize: fontSizes,
          },
        ]}
      >
        {formatBDT(price)}
      </Text>

      {hasDiscount && (
        <View style={styles.discountRow}>
          <Text
            style={[
              styles.originalPrice,
              {
                color: colors.textMuted,
                fontSize: fontSizes * 0.75,
              },
            ]}
          >
            {formatBDT(originalPrice)}
          </Text>
          <View
            style={[
              styles.discountBadge,
              {
                backgroundColor: colors.dangerLight,
                borderColor: colors.dangerBorder,
                borderRadius: borderRadius.xs,
              },
            ]}
          >
            <Text style={[styles.discountText, { color: colors.danger }]}>
              -{discountPercent}%
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  priceText: {
    fontWeight: '700',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  originalPrice: {
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  discountBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
