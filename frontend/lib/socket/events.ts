export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  JOIN_CHAT: 'join_chat',
  LEAVE_CHAT: 'leave_chat',
  SEND_MESSAGE: 'send_message',
  NEW_MESSAGE: 'new_message',
  SCAM_ALERT: 'scam_alert',
  OFFER_UPDATED: 'offer_updated',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  USER_TYPING: 'user_typing',
  PRICE_DROP_ALERT: 'price_drop_alert',
  USER_NOTIFICATION: 'user_notification',
} as const;

