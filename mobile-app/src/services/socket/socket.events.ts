export const SOCKET_EVENTS = {
  // Client to Server
  JOIN_CHAT: 'join_chat',
  LEAVE_CHAT: 'leave_chat',
  SEND_MESSAGE: 'send_message',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',

  // Server to Client
  NEW_MESSAGE: 'new_message',
  SCAM_ALERT: 'scam_alert',
  TYPING_INDICATOR: 'typing_indicator',
  OFFER_UPDATED: 'offer_updated',
  PRICE_DROP_ALERT: 'price_drop_alert',
  USER_NOTIFICATION: 'user_notification',
} as const;

export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
