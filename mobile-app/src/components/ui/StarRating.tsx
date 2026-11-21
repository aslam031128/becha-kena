import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

export interface StarRatingProps {
  rating: number; // 0 to 5
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  size?: number;
  showScore?: boolean;
  reviewCount?: number;
  style?: ViewStyle;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  interactive = false,
  onRatingChange,
  size = 16,
  showScore = false,
  reviewCount,
  style,
}) => {
  const { colors } = useTheme();

  const handlePress = (selectedStar: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(selectedStar);
    }
  };

  const renderStar = (index: number) => {
    const starValue = index + 1;
    let iconName: 'star' | 'star-half' | 'star-outline' = 'star-outline';

    if (rating >= starValue) {
      iconName = 'star';
    } else if (rating >= starValue - 0.5) {
      iconName = 'star-half';
    }

    const starColor = rating >= starValue - 0.5 ? '#F59E0B' : colors.borderStrong;

    if (interactive) {
      return (
        <TouchableOpacity
          key={index}
          onPress={() => handlePress(starValue)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Ionicons name={iconName} size={size} color={starColor} style={{ marginRight: 4 }} />
        </TouchableOpacity>
      );
    }

    return (
      <Ionicons
        key={index}
        name={iconName}
        size={size}
        color={starColor}
        style={{ marginRight: 2 }}
      />
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsRow}>{[0, 1, 2, 3, 4].map(renderStar)}</View>

      {showScore && (
        <Text style={[styles.scoreText, { color: colors.textPrimary, fontSize: size * 0.9 }]}>
          {rating.toFixed(1)}
        </Text>
      )}

      {reviewCount !== undefined && (
        <Text style={[styles.countText, { color: colors.textSecondary, fontSize: size * 0.8 }]}>
          ({reviewCount})
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontWeight: '700',
    marginLeft: 4,
  },
  countText: {
    marginLeft: 4,
  },
});
