import { ChatMessage } from './chat.types';
import { Offer } from './offer.types';

export interface JoinChatPayload {
  conversationId: string;
}

export interface LeaveChatPayload {
  conversationId: string;
}

export interface SendSocketMessagePayload {
  conversationId: string;
  content: string;
  type?: 'text' | 'image';
  mediaUrl?: string;
}

export interface TypingIndicatorPayload {
  conversationId: string;
  userId: string;
}

export interface SocketNewMessageEvent {
  message: ChatMessage;
}

export interface SocketScamAlertEvent {
  messageId: string;
  warning: string;
}

export interface SocketOfferUpdatedEvent {
  offer: Offer;
}

export interface SocketPriceDropAlertEvent {
  listingId: string;
  title: string;
  oldPrice: number;
  newPrice: number;
}

export interface SocketUserNotificationEvent {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
}

