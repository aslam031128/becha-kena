import { create } from 'zustand';
import { Conversation, ChatMessage } from '@/lib/types/chat.types';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, ChatMessage[]>;
  typingUsers: Record<string, boolean>; // conversationId: isTyping

  setConversations: (conversations: Conversation[]) => void;
  setActiveConversationId: (id: string | null) => void;
  setMessages: (conversationId: string, messages: ChatMessage[]) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  updateUnreadCount: (conversationId: string, count: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},

  setConversations: (conversations) => set({ conversations }),

  setActiveConversationId: (id) => set({ activeConversationId: id }),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),

  addMessage: (conversationId, message) =>
    set((state) => {
      const prevMessages = state.messages[conversationId] || [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...prevMessages, message],
        },
      };
    }),

  setTyping: (conversationId, isTyping) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [conversationId]: isTyping },
    })),

  updateUnreadCount: (conversationId, count) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: count } : c
      ),
    })),
}));

