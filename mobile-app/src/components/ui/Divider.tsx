import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

export interface DividerProps {
  label?: string;
  orientation?: 'horizontal' | 'vertical';
  style?: ViewStyle;
}

export const Divider: React.FC<DividerProps> = ({
  label,
  orientation = 'horizontal',
  style,
}) => {
  const { colors, spacing } = useTheme();

  if (orientation === 'vertical') {
    return (
      <View
        style={[
          styles.vertical,
          { backgroundColor: colors.border, marginHorizontal: spacing.sm },
          style,
        ]}
      />
    );
  }

  if (label) {
    return (
      <View style={[styles.containerWithLabel, { marginVertical: spacing.md }, style]}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.horizontal,
        { backgroundColor: colors.border, marginVertical: spacing.sm },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: '100%',
  },
  vertical: {
    width: 1,
    height: '100%',
  },
  containerWithLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  line: {
    flex: 1,
    height: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 12,
  },
});
