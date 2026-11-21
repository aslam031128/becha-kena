import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { socketClient } from '@/services/socket/socket.client';
import { ConversationCard } from '@/components/chat/ConversationCard';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ChatInboxScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const router = useRouter();

  const { user, isAuthenticated } = useAuthStore();
  const {
    conversations,
    unreadCount,
    isLoading,
    isRefreshing,
    fetchConversations,
    addMessage,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated]);

  // Connect live new_message listener
  useEffect(() => {
    const unsub = socketClient.onNewMessage((msg) => {
      addMessage(msg);
    });
    return () => unsub();
  }, []);

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const name = c.counterpart?.displayName?.toLowerCase() || '';
    const title = c.listing?.title?.toLowerCase() || '';
    return name.includes(q) || title.includes(q);
  });

  const handleConversationPress = (conversationId: string) => {
    router.push(`/(tabs)/chat/${conversationId}` as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Messages
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary, borderRadius: borderRadius.full }]}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {/* Search Bar Input */}
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              marginTop: spacing.xs,
            },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            placeholder="Search by citizen name or ad title..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Conversations List */}
      {isLoading && conversations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading inbox messages...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.conversationId}
          renderItem={({ item }) => (
            <ConversationCard
              conversation={item}
              currentUserId={user?.id}
              onPress={() => handleConversationPress(item.conversationId)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />}
              title={searchQuery ? 'No Results Found' : 'No Messages Yet'}
              subtitle={
                searchQuery
                  ? 'No conversations match your search term. Try a different keyword.'
                  : 'Inquire on ads or receive messages from buyers to start peer-to-peer conversations.'
              }
              actionTitle={searchQuery ? 'Clear Search' : 'Browse Marketplace'}
              onAction={() => {
                if (searchQuery) {
                  setSearchQuery('');
                } else {
                  router.push('/(public)' as any);
                }
              }}
              style={{ marginTop: 40 }}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={fetchConversations}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
});
