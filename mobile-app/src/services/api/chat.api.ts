import { apiClient } from './client';
import { ApiResponse } from '@/types/api.types';
import { Conversation, Message } from '@/types/chat.types';

export const chatApi = {
  startConversation: async (listingId: string): Promise<ApiResponse<Conversation>> => {
    const response = await apiClient.post<ApiResponse<Conversation>>('/chats/start', {
      listingId,
    });
    return response.data;
  },

  getConversations: async (): Promise<ApiResponse<Conversation[]>> => {
    const response = await apiClient.get<ApiResponse<Conversation[]>>('/chats');
    return response.data;
  },

  getMessages: async (
    conversationId: string,
    params?: { page?: number; limit?: number }
  ): Promise<ApiResponse<Message[]>> => {
    const response = await apiClient.get<ApiResponse<Message[]>>(
      `/chats/${conversationId}/messages`,
      { params }
    );
    return response.data;
  },

  sendMessage: async (
    conversationId: string,
    text: string
  ): Promise<ApiResponse<Message>> => {
    const response = await apiClient.post<ApiResponse<Message>>(
      `/chats/${conversationId}/messages`,
      { text }
    );
    return response.data;
  },
};
