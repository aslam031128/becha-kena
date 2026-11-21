import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';
import { CATEGORIES } from '@/utils/bd-data';
import { ListingCategory } from '@/types/listing.types';

export interface CategoryChipsProps {
  selectedCategory?: ListingCategory | string;
  onSelectCategory: (category?: ListingCategory) => void;
  showAllOption?: boolean;
  style?: ViewStyle;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  selectedCategory,
  onSelectCategory,
  showAllOption = true,
  style,
}) => {
  const { colors, spacing, borderRadius } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.container,
        { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
      ]}
      style={style}
    >
      {showAllOption && (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => onSelectCategory(undefined)}
          style={[
            styles.chip,
            {
              backgroundColor: !selectedCategory ? colors.primary : colors.surface,
              borderColor: !selectedCategory ? colors.primary : colors.border,
              borderRadius: borderRadius.full,
              marginRight: spacing.sm,
            },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              {
                color: !selectedCategory ? colors.surface : colors.textPrimary,
                fontWeight: !selectedCategory ? '700' : '500',
              },
            ]}
          >
            🔥 All
          </Text>
        </TouchableOpacity>
      )}

      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            activeOpacity={0.75}
            onPress={() => onSelectCategory(isSelected ? undefined : cat.id)}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? colors.primary : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
                borderRadius: borderRadius.full,
                marginRight: spacing.sm,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: isSelected ? colors.surface : colors.textPrimary,
                  fontWeight: isSelected ? '700' : '500',
                },
              ]}
            >
              {cat.icon} {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
});
