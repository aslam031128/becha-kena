export type MessageType = 'text' | 'image' | 'system' | 'offer_event';

export interface ChatMessage {
  id: string;
  _id?: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  messageType?: string;
  content: string;
  text?: string;
  mediaUrl?: string | null;
  hasScamWarning: boolean;
  offerId?: string | null;
  createdAt: string;
}

export interface ConversationParticipant {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isNidVerified: boolean;
}

export interface ConversationListingSummary {
  id: string;
  title: string;
  price: number;
  thumbnailUrl: string;
  status: string;
}

export interface Conversation {
  id: string;
  conversationId?: string;
  listingId: string;
  listing: ConversationListingSummary;
  counterpart: ConversationParticipant;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

