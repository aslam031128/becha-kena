import { apiClient } from './client';
import { ApiSuccessResponse } from '@/lib/types/api.types';
import { Conversation, ChatMessage } from '@/lib/types/chat.types';

export const chatApi = {
  getConversations: () =>
    apiClient.get<ApiSuccessResponse<Conversation[]>>('/chats'),

  startConversation: (listingId: string) =>
    apiClient.post<ApiSuccessResponse<Conversation>>('/chats/start', { listingId }),

  getMessages: (conversationId: string, page = 1, limit = 30) =>
    apiClient.get<ApiSuccessResponse<ChatMessage[]>>(`/chats/${conversationId}/messages`, {
      params: { page, limit },
    }),

  sendMessage: (
    conversationId: string,
    data: { content: string; type?: 'text' | 'image'; mediaUrl?: string }
  ) =>
    apiClient.post<ApiSuccessResponse<ChatMessage>>(`/chats/${conversationId}/messages`, data),
};

