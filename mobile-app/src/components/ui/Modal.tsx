import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  footer,
  contentStyle,
}) => {
  const { colors, borderRadius, spacing } = useTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: colors.card,
                  borderTopLeftRadius: borderRadius.xxl,
                  borderTopRightRadius: borderRadius.xxl,
                  paddingBottom: spacing.xxl,
                },
                contentStyle,
              ]}
            >
              {/* Drag indicator bar */}
              <View
                style={[
                  styles.handleBar,
                  { backgroundColor: colors.borderStrong },
                ]}
              />

              {/* Header */}
              {title && (
                <View
                  style={[
                    styles.header,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.title,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {title}
                  </Text>
                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Content */}
              <ScrollView
                style={styles.contentScroll}
                contentContainerStyle={{ padding: spacing.lg }}
                bounces={false}
              >
                {children}
              </ScrollView>

              {/* Footer */}
              {footer && (
                <View
                  style={[
                    styles.footer,
                    { borderTopColor: colors.border, padding: spacing.md },
                  ]}
                >
                  {footer}
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '85%',
    width: '100%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  contentScroll: {
    maxHeight: 500,
  },
  footer: {
    borderTopWidth: 1,
  },
});
