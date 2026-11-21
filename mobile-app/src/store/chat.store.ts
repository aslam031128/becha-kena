import { create } from 'zustand';
import { Conversation, Message } from '@/types/chat.types';
import { chatApi } from '@/services/api/chat.api';
import { socketClient } from '@/services/socket/socket.client';
import { parseApiError } from '@/services/api/client';

export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  unreadCount: number;
  typingUsers: Record<string, boolean>; // keyed by conversationId
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Actions
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, text: string, currentUserId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  markAsRead: (conversationId: string) => void;
  setActiveConversation: (conversationId: string | null) => void;
  startOrGetConversation: (listingId: string) => Promise<Conversation>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  unreadCount: 0,
  typingUsers: {},
  isLoading: false,
  isRefreshing: false,
  error: null,

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await chatApi.getConversations();
      const convList = response.data || [];
      const totalUnread = convList.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

      set({
        conversations: convList,
        unreadCount: totalUnread,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: parseApiError(err), isLoading: false });
    }
  },

  fetchMessages: async (conversationId: string) => {
    try {
      const response = await chatApi.getMessages(conversationId, { limit: 50 });
      const msgList = response.data || [];

      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: msgList,
        },
      }));
    } catch (err: any) {
      // ignore message load failure for now
    }
  },

  sendMessage: async (conversationId: string, text: string, currentUserId: string) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMessage: Message = {
      id: tempId,
      conversationId,
      senderId: currentUserId,
      text,
      messageType: 'text',
      hasScamWarning: false,
      deliveryStatus: 'sending',
      createdAt: new Date().toISOString(),
    };

    // 1. Optimistic local append
    const currentMsgs = get().messages[conversationId] || [];
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...currentMsgs, optimisticMessage],
      },
    }));

    // 2. Dispatch via Socket.io if active
    if (socketClient.isConnected()) {
      socketClient.sendMessage(conversationId, text);
    }

    // 3. HTTP fall-through to ensure durability and scam moderation
    try {
      const response = await chatApi.sendMessage(conversationId, text);
      const serverMsg = response.data;

      // Replace optimistic message with confirmed server message
      set((state) => {
        const msgs = (state.messages[conversationId] || []).map((m) =>
          m.id === tempId ? { ...serverMsg, deliveryStatus: 'delivered' as const } : m
        );

        // Update conversation lastMessage & move to top
        const updatedConvs = state.conversations.map((c) => {
          if (c.conversationId === conversationId) {
            return {
              ...c,
              lastMessage: {
                text: serverMsg.text,
                senderId: serverMsg.senderId,
                createdAt: serverMsg.createdAt,
              },
              hasScamFlag: serverMsg.hasScamWarning,
              updatedAt: serverMsg.createdAt,
            };
          }
          return c;
        });

        // Sort latest first
        updatedConvs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        return {
          messages: {
            ...state.messages,
            [conversationId]: msgs,
          },
          conversations: updatedConvs,
        };
      });
    } catch {
      // Mark as failed
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((m) =>
            m.id === tempId ? { ...m, deliveryStatus: 'failed' as const } : m
          ),
        },
      }));
    }
  },

  addMessage: (message: Message) => {
    const { activeConversationId, messages, conversations, unreadCount } = get();
    const convId = message.conversationId;
    const existingList = messages[convId] || [];

    // Check if already present (e.g. from optimistic send)
    const exists = existingList.some(
      (m) => m.id === message.id || (m.text === message.text && m.senderId === message.senderId)
    );

    const updatedList = exists
      ? existingList.map((m) => (m.text === message.text ? { ...message, deliveryStatus: 'delivered' as const } : m))
      : [...existingList, { ...message, deliveryStatus: 'delivered' as const }];

    // Move conversation to top
    let conversationFound = false;
    const updatedConvs = conversations.map((c) => {
      if (c.conversationId === convId) {
        conversationFound = true;
        const isNotActive = activeConversationId !== convId;
        return {
          ...c,
          lastMessage: {
            text: message.text,
            senderId: message.senderId,
            createdAt: message.createdAt,
          },
          hasScamFlag: message.hasScamWarning || c.hasScamFlag,
          unreadCount: isNotActive ? (c.unreadCount || 0) + 1 : 0,
          updatedAt: message.createdAt,
        };
      }
      return c;
    });

    updatedConvs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const isDifferentThread = activeConversationId !== convId;

    set({
      messages: {
        ...messages,
        [convId]: updatedList,
      },
      conversations: updatedConvs,
      unreadCount: isDifferentThread ? unreadCount + 1 : unreadCount,
    });
  },

  setTyping: (conversationId: string, isTyping: boolean) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: isTyping,
      },
    }));
  },

  markAsRead: (conversationId: string) => {
    set((state) => {
      const conv = state.conversations.find((c) => c.conversationId === conversationId);
      const deduct = conv?.unreadCount || 0;

      return {
        conversations: state.conversations.map((c) =>
          c.conversationId === conversationId ? { ...c, unreadCount: 0 } : c
        ),
        unreadCount: Math.max(0, state.unreadCount - deduct),
      };
    });
  },

  setActiveConversation: (conversationId: string | null) => {
    set({ activeConversationId: conversationId });
    if (conversationId) {
      get().markAsRead(conversationId);
    }
  },

  startOrGetConversation: async (listingId: string): Promise<Conversation> => {
    set({ isLoading: true });
    try {
      const response = await chatApi.startConversation(listingId);
      const conv = response.data;

      // Add to list if not present
      set((state) => {
        const exists = state.conversations.some((c) => c.conversationId === conv.conversationId);
        const updated = exists ? state.conversations : [conv, ...state.conversations];
        return {
          conversations: updated,
          isLoading: false,
        };
      });

      return conv;
    } catch (err: any) {
      set({ isLoading: false });
      throw new Error(parseApiError(err));
    }
  },
}));
