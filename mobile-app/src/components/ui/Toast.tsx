import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

export type ToastVariant = 'success' | 'warning' | 'error' | 'info';

export interface ToastProps {
  visible: boolean;
  message: string;
  variant?: ToastVariant;
  onDismiss: () => void;
  duration?: number;
  style?: ViewStyle;
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  variant = 'info',
  onDismiss,
  duration = 3000,
  style,
}) => {
  const { colors, borderRadius, spacing } = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.timing(translateY, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  if (!visible) return null;

  const getConfig = () => {
    switch (variant) {
      case 'success':
        return {
          bg: colors.successLight,
          border: colors.success,
          color: colors.primaryDark,
          icon: 'checkmark-circle' as const,
        };
      case 'warning':
        return {
          bg: colors.warningLight,
          border: colors.warning,
          color: colors.warningDark,
          icon: 'alert-circle' as const,
        };
      case 'error':
        return {
          bg: colors.dangerLight,
          border: colors.danger,
          color: colors.dangerDark,
          icon: 'close-circle' as const,
        };
      default:
        return {
          bg: colors.secondaryLight,
          border: colors.secondary,
          color: colors.secondaryDark,
          icon: 'information-circle' as const,
        };
    }
  };

  const config = getConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          backgroundColor: config.bg,
          borderColor: config.border,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
        },
        style,
      ]}
    >
      <Ionicons name={config.icon} size={20} color={config.color} style={{ marginRight: 8 }} />
      <Text style={[styles.text, { color: config.color }]}>{message}</Text>
      <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={18} color={config.color} style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});
