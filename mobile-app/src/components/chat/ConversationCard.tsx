import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Conversation } from '@/types/chat.types';
import { Avatar } from '@/components/ui/Avatar';
import { formatRelativeDate } from '@/utils/formatters';

export interface ConversationCardProps {
  conversation: Conversation;
  currentUserId?: string;
  onPress: () => void;
}

export const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  currentUserId,
  onPress,
}) => {
  const { colors, borderRadius } = useTheme();

  const isUnread = (conversation.unreadCount || 0) > 0;
  const isLastMsgMine = conversation.lastMessage?.senderId === currentUserId;
  const lastMsgPrefix = isLastMsgMine ? 'You: ' : '';
  const lastMsgText = conversation.lastMessage ? `${lastMsgPrefix}${conversation.lastMessage.text}` : 'No messages yet';

  const counterpartName = conversation.counterpart?.displayName || conversation.seller?.displayName || 'Citizen';
  const counterpartAvatar = conversation.counterpart?.avatarUrl || conversation.seller?.avatarUrl || undefined;
  const isVerified = conversation.counterpart?.isNidVerified ?? conversation.seller?.isNidVerified ?? true;

  const thumbnail = conversation.listing?.thumbnailUrl;
  const formattedTime = conversation.lastMessage?.createdAt
    ? formatRelativeDate(conversation.lastMessage.createdAt)
    : '';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: isUnread ? colors.primaryLight : colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* Left: Avatar */}
      <View style={styles.avatarWrap}>
        <Avatar
          name={counterpartName}
          url={counterpartAvatar}
          isVerified={isVerified}
          size="md"
        />
      </View>

      {/* Center: Details */}
      <View style={styles.centerCol}>
        <View style={styles.nameRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.nameText,
              {
                color: colors.textPrimary,
                fontWeight: isUnread ? '800' : '600',
              },
            ]}
          >
            {counterpartName}
          </Text>

          {conversation.hasScamFlag && (
            <Ionicons name="flag" size={13} color={colors.danger} style={{ marginLeft: 4 }} />
          )}
        </View>

        {conversation.listing && (
          <Text
            numberOfLines={1}
            style={[styles.listingRef, { color: colors.textSecondary }]}
          >
            Re: {conversation.listing.title}
          </Text>
        )}

        <Text
          numberOfLines={1}
          style={[
            styles.lastMsgText,
            {
              color: isUnread ? colors.textPrimary : colors.textMuted,
              fontWeight: isUnread ? '600' : '400',
            },
          ]}
        >
          {lastMsgText}
        </Text>
      </View>

      {/* Right: Timestamp, Thumbnail & Unread Badge */}
      <View style={styles.rightCol}>
        <Text style={[styles.timeText, { color: colors.textMuted }]}>
          {formattedTime}
        </Text>

        <View style={styles.rightBottomRow}>
          {isUnread && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary, borderRadius: borderRadius.full }]}>
              <Text style={styles.unreadCountText}>{conversation.unreadCount}</Text>
            </View>
          )}

          {thumbnail ? (
            <Image
              source={{ uri: thumbnail }}
              style={[styles.listingThumbnail, { borderRadius: borderRadius.sm }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.listingThumbnail, { backgroundColor: colors.surfaceAlt, borderRadius: borderRadius.sm }]} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrap: {
    marginRight: 12,
  },
  centerCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 15,
  },
  listingRef: {
    fontSize: 12,
    marginTop: 2,
  },
  lastMsgText: {
    fontSize: 13,
    marginTop: 3,
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 52,
    marginLeft: 8,
  },
  timeText: {
    fontSize: 11,
  },
  rightBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  listingThumbnail: {
    width: 36,
    height: 36,
  },
});
