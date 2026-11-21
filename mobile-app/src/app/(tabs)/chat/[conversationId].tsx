import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { socketClient } from '@/services/socket/socket.client';
import { Message } from '@/types/chat.types';
import { Avatar, Badge, PriceTag } from '@/components/ui';
import {
  ChatBubble,
  ScamWarningBanner,
  SafetyGuidelinesModal,
  detectScamKeywords,
  detectPhishingLinks,
} from '@/components/chat';

export default function ChatThreadScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { colors, spacing, borderRadius } = useTheme();
  const router = useRouter();

  const { user } = useAuthStore();
  const {
    conversations,
    messages,
    typingUsers,
    fetchMessages,
    sendMessage,
    addMessage,
    setTyping,
    setActiveConversation,
  } = useChatStore();

  const [inputText, setInputText] = useState('');
  const [isGuidelinesModalOpen, setIsGuidelinesModalOpen] = useState(false);
  const [liveScamBanner, setLiveScamBanner] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<any>(null);

  const activeConversation = conversations.find((c) => c.conversationId === conversationId);
  const currentMessages = conversationId ? messages[conversationId] || [] : [];
  const isCounterpartTyping = conversationId ? !!typingUsers[conversationId] : false;

  const counterpart = activeConversation?.counterpart || activeConversation?.seller;
  const counterpartName = counterpart?.displayName || 'Citizen';
  const counterpartAvatar = counterpart?.avatarUrl;
  const isVerified = counterpart?.isNidVerified ?? true;
  const listing = activeConversation?.listing;

  // Active chat lifecycle
  useEffect(() => {
    if (!conversationId) return;

    setActiveConversation(conversationId);
    fetchMessages(conversationId);
    socketClient.joinChat(conversationId);

    // Live socket listeners
    const unsubMsg = socketClient.onNewMessage((msg) => {
      if (msg.conversationId === conversationId) {
        addMessage(msg);
      }
    });

    const unsubScam = socketClient.onScamAlert((data) => {
      if (data.conversationId === conversationId) {
        setLiveScamBanner(data.warningBanner);
      }
    });

    const unsubTyping = socketClient.onTypingIndicator((data) => {
      if (data.conversationId === conversationId) {
        setTyping(conversationId, data.isTyping);
      }
    });

    return () => {
      socketClient.leaveChat(conversationId);
      setActiveConversation(null);
      unsubMsg();
      unsubScam();
      unsubTyping();
    };
  }, [conversationId]);

  // Input change with typing indicator and client predictive scam check
  const handleTextChange = (text: string) => {
    setInputText(text);

    if (!conversationId) return;

    // Emit typing indicator
    socketClient.startTyping(conversationId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketClient.stopTyping(conversationId);
    }, 2000);
  };

  const hasTypingScamWarning = detectScamKeywords(inputText);
  const hasPhishingWarning = detectPhishingLinks(inputText);

  const handleSend = async () => {
    if (!inputText.trim() || !conversationId || !user?.id) return;

    const textToSend = inputText.trim();
    setInputText('');
    socketClient.stopTyping(conversationId);

    await sendMessage(conversationId, textToSend, user.id);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Counterpart Profile shortcut */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (counterpart?.id) {
              router.push(`/(public)/user/${counterpart.id}` as any);
            }
          }}
          style={styles.headerProfile}
        >
          <Avatar
            name={counterpartName}
            url={counterpartAvatar}
            isVerified={isVerified}
            size="sm"
          />
          <View style={{ marginLeft: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text
                numberOfLines={1}
                style={[styles.counterpartName, { color: colors.textPrimary }]}
              >
                {counterpartName}
              </Text>
              {isVerified && <Badge variant="verified" label="Verified" size="sm" />}
            </View>
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              {isCounterpartTyping ? 'typing...' : 'NID Authenticated'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Safety Guidelines Trigger */}
        <TouchableOpacity
          onPress={() => setIsGuidelinesModalOpen(true)}
          style={styles.safetyBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Associated Listing Banner Strip */}
      {listing && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(`/(public)/listing/${listing.id}` as any)}
          style={[
            styles.listingBanner,
            {
              backgroundColor: colors.surfaceAlt,
              borderBottomColor: colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical: 8,
            },
          ]}
        >
          {listing.thumbnailUrl ? (
            <Image
              source={{ uri: listing.thumbnailUrl }}
              style={[styles.listingThumb, { borderRadius: borderRadius.sm }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.listingThumb, { backgroundColor: colors.border, borderRadius: borderRadius.sm }]} />
          )}

          <View style={styles.listingInfo}>
            <Text
              numberOfLines={1}
              style={[styles.listingTitle, { color: colors.textPrimary }]}
            >
              {listing.title}
            </Text>
            <PriceTag price={listing.price} size="sm" />
          </View>

          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Live Scam Alert if triggered by socket */}
      {liveScamBanner && (
        <ScamWarningBanner
          customText={liveScamBanner}
          onDismiss={() => setLiveScamBanner(null)}
          style={{ marginHorizontal: spacing.md, marginTop: 4 }}
        />
      )}

      {/* Message Feed */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={currentMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              isCurrentUser={item.senderId === user?.id}
            />
          )}
          contentContainerStyle={{ paddingVertical: 12 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Ionicons name="lock-closed-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Messages in this thread are securely end-to-end monitored for citizen protection against advance payment scams.
              </Text>
            </View>
          }
        />

        {/* Counterpart Typing Bubble */}
        {isCounterpartTyping && (
          <View style={styles.typingRow}>
            <Text style={[styles.typingText, { color: colors.textSecondary }]}>
              {counterpartName} is typing...
            </Text>
          </View>
        )}

        {/* Client Predictive Scam Warning */}
        {hasTypingScamWarning && (
          <ScamWarningBanner
            variant="warning"
            customText="Reminder: Becha-Kena transactions should be settled in person upon physical verification. Do not ask for advance money."
            style={{ marginHorizontal: spacing.md }}
          />
        )}

        {/* Phishing Warning */}
        {hasPhishingWarning && (
          <ScamWarningBanner
            customText="🔗 External links and APK downloads have been disabled to protect against phishing scams."
            style={{ marginHorizontal: spacing.md }}
          />
        )}

        {/* Bottom Input Bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
            },
          ]}
        >
          {/* Action to Make Offer (Phase 7) */}
          <TouchableOpacity
            onPress={() => {
              alert('Binding Offers & Negotiation will be fully interactive in Phase 7.');
            }}
            style={[
              styles.offerQuickBtn,
              {
                backgroundColor: colors.primaryLight,
                borderColor: colors.primary,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            <Ionicons name="pricetag" size={14} color={colors.primary} />
            <Text style={[styles.offerQuickText, { color: colors.primary }]}>
              Offer
            </Text>
          </TouchableOpacity>

          <TextInput
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={handleTextChange}
            multiline
            maxLength={1000}
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
                color: colors.textPrimary,
              },
            ]}
          />

          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim()}
            style={[
              styles.sendBtn,
              {
                backgroundColor: inputText.trim() ? colors.primary : colors.surfaceAlt,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() ? '#FFFFFF' : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Safety Guidelines Modal */}
      <SafetyGuidelinesModal
        visible={isGuidelinesModalOpen}
        onClose={() => setIsGuidelinesModalOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
    marginRight: 6,
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterpartName: {
    fontSize: 14,
    fontWeight: '700',
    maxWidth: 140,
  },
  statusText: {
    fontSize: 11,
    marginTop: 1,
  },
  safetyBtn: {
    padding: 6,
  },
  listingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listingThumb: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  emptyMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 60,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  typingRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    gap: 8,
  },
  offerQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 4,
  },
  offerQuickText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  sendBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
