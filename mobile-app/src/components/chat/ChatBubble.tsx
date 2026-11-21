import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Message } from '@/types/chat.types';
import { ScamWarningBanner } from './ScamWarningBanner';

export interface ChatBubbleProps {
  message: Message;
  isCurrentUser: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isCurrentUser }) => {
  const { colors, borderRadius } = useTheme();

  const formattedTime = (() => {
    try {
      const d = new Date(message.createdAt);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  })();

  const renderStatusIcon = () => {
    if (!isCurrentUser) return null;

    if (message.deliveryStatus === 'sending') {
      return <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.7)" style={styles.statusIcon} />;
    }
    if (message.deliveryStatus === 'failed') {
      return <Ionicons name="alert-circle" size={12} color={colors.warningLight} style={styles.statusIcon} />;
    }
    // Delivered
    return <Ionicons name="checkmark-done" size={13} color="rgba(255,255,255,0.85)" style={styles.statusIcon} />;
  };

  return (
    <View style={[styles.wrapper, isCurrentUser ? styles.wrapperRight : styles.wrapperLeft]}>
      {/* Inline Scam Warning if triggered */}
      {message.hasScamWarning && (
        <ScamWarningBanner
          customText={message.warningText || '⚠️ Warning: Potential advance payment scam detected in this message.'}
          style={{ marginBottom: 4, maxWidth: '85%' }}
        />
      )}

      {/* Bubble Container */}
      <View
        style={[
          styles.bubble,
          isCurrentUser
            ? [
                styles.bubbleRight,
                {
                  backgroundColor: colors.primary,
                  borderBottomRightRadius: 4,
                  borderTopLeftRadius: borderRadius.lg,
                  borderTopRightRadius: borderRadius.lg,
                  borderBottomLeftRadius: borderRadius.lg,
                },
              ]
            : [
                styles.bubbleLeft,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderBottomLeftRadius: 4,
                  borderTopLeftRadius: borderRadius.lg,
                  borderTopRightRadius: borderRadius.lg,
                  borderBottomRightRadius: borderRadius.lg,
                },
              ],
        ]}
      >
        <Text
          style={[
            styles.messageText,
            { color: isCurrentUser ? '#FFFFFF' : colors.textPrimary },
          ]}
        >
          {message.text}
        </Text>

        <View style={styles.timeRow}>
          <Text
            style={[
              styles.timeText,
              { color: isCurrentUser ? 'rgba(255, 255, 255, 0.7)' : colors.textMuted },
            ]}
          >
            {formattedTime}
          </Text>
          {renderStatusIcon()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  wrapperRight: {
    alignItems: 'flex-end',
  },
  wrapperLeft: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleRight: {},
  bubbleLeft: {},
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
  },
  statusIcon: {
    marginLeft: 4,
  },
});
