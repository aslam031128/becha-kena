import React from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { useTheme } from '@/theme';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outlined' | 'flat';
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  variant = 'elevated',
}) => {
  const { colors, borderRadius, spacing } = useTheme();

  const getCardStyle = (): ViewStyle => {
    const base: ViewStyle = {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    };

    if (variant === 'elevated') {
      return {
        ...base,
        borderWidth: Platform.OS === 'ios' ? 0.5 : 0,
        borderColor: colors.border,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      };
    }

    if (variant === 'outlined') {
      return {
        ...base,
        borderWidth: 1,
        borderColor: colors.border,
      };
    }

    // flat
    return {
      ...base,
      backgroundColor: colors.surface,
    };
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[getCardStyle(), style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[getCardStyle(), style]}>{children}</View>;
};
