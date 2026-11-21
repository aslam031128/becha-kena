import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

export interface AvatarProps {
  url?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isVerified?: boolean;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  url,
  name = 'User',
  size = 'md',
  isVerified = false,
  style,
}) => {
  const { colors, borderRadius } = useTheme();
  const [hasError, setHasError] = useState(false);

  const dimension = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 84,
  }[size];

  const badgeSize = {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
  }[size];

  const getInitials = (n: string) => {
    return (
      n
        .split(' ')
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'U'
    );
  };

  return (
    <View style={[{ width: dimension, height: dimension }, style]}>
      <View
        style={[
          styles.avatarContainer,
          {
            width: dimension,
            height: dimension,
            borderRadius: borderRadius.full,
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
            borderWidth: 1,
          },
        ]}
      >
        {url && !hasError ? (
          <Image
            source={{ uri: url }}
            style={{ width: dimension, height: dimension, borderRadius: borderRadius.full }}
            onError={() => setHasError(true)}
          />
        ) : (
          <Text
            style={[
              styles.initials,
              {
                color: colors.primary,
                fontSize: dimension * 0.4,
              },
            ]}
          >
            {getInitials(name)}
          </Text>
        )}
      </View>

      {/* Verified Shield Badge Overlay */}
      {isVerified && (
        <View
          style={[
            styles.verifiedBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: colors.verifiedBadge,
              borderColor: colors.card,
              borderWidth: 1.5,
            },
          ]}
        >
          <Ionicons name="checkmark" size={badgeSize * 0.7} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '700',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
