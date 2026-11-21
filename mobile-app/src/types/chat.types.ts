export type MessageType = 'text' | 'image' | 'system' | 'offer_event';

export type MessageDeliveryStatus = 'sending' | 'delivered' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  messageType: MessageType;
  hasScamWarning: boolean;
  warningText?: string;
  deliveryStatus?: MessageDeliveryStatus;
  isDeleted?: boolean;
  createdAt: string;
}

export interface ConversationParticipant {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  isNidVerified: boolean;
}

export interface ConversationListingSummary {
  id: string;
  title: string;
  price: number;
  status: string;
  thumbnailUrl?: string;
}

export interface ConversationLastMessage {
  text: string;
  senderId: string;
  createdAt: string;
}

export interface Conversation {
  conversationId: string;
  listing: ConversationListingSummary;
  counterpart?: ConversationParticipant;
  seller?: ConversationParticipant;
  buyer?: ConversationParticipant;
  lastMessage?: ConversationLastMessage;
  status: 'active' | 'blocked' | 'archived';
  hasScamFlag?: boolean;
  unreadCount?: number;
  updatedAt: string;
  createdAt?: string;
}

// Real-Time Socket Event Payload Types
export interface SocketNewMessagePayload extends Message {}

export interface SocketScamAlertPayload {
  conversationId: string;
  warningBanner: string;
}

export interface SocketTypingPayload {
  conversationId: string;
  userId?: string;
}

export interface SocketOfferUpdatedPayload {
  offerId: string;
  conversationId: string;
  status: 'pending' | 'accepted' | 'declined' | 'countered' | 'expired';
  amount: number;
  round: number;
  dealId?: string;
}

export interface SocketPriceDropPayload {
  listingId: string;
  title: string;
  oldPrice: number;
  newPrice: number;
  discountPercentage: number;
  message: string;
}

export interface SocketUserNotificationPayload {
  type: string;
  title: string;
  message: string;
  timestamp: string;
}
