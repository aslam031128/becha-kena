'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket } from './client';
import { SOCKET_EVENTS } from './events';
import { useAuthStore } from '@/lib/store/auth.store';
import { useNotificationStore } from '@/lib/store/notification.store';
import { ChatMessage } from '@/lib/types/chat.types';
import { Offer } from '@/lib/types/offer.types';
import { chatApi } from '@/lib/api/chat.api';
import toast from 'react-hot-toast';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket();

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on(SOCKET_EVENTS.CONNECT, onConnect);
    socket.on(SOCKET_EVENTS.DISCONNECT, onDisconnect);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off(SOCKET_EVENTS.CONNECT, onConnect);
      socket.off(SOCKET_EVENTS.DISCONNECT, onDisconnect);
    };
  }, [accessToken]);

  return { isConnected };
}

export function useChatRoom(conversationId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeOffer, setActiveOffer] = useState<Offer | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [hasScamAlert, setHasScamAlert] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!conversationId || conversationId === 'undefined') return;

    const socket = getSocket();

    // 1. Join Chat Room
    socket.emit(SOCKET_EVENTS.JOIN_CHAT, { conversationId });

    // 2. New Message Listener
    const handleNewMessage = (
      msg: Partial<ChatMessage> & { _id?: string; text?: string; messageType?: string }
    ) => {
      const normalized: ChatMessage = {
        id: msg.id || msg._id || `msg-${Date.now()}`,
        conversationId: msg.conversationId || conversationId,
        senderId: msg.senderId || '',
        type: (msg.type || msg.messageType || 'text') as ChatMessage['type'],
        content: msg.content || msg.text || '',
        mediaUrl: msg.mediaUrl,
        hasScamWarning: Boolean(msg.hasScamWarning),
        offerId: msg.offerId,
        createdAt: msg.createdAt || new Date().toISOString(),
      };

      setMessages((prev) => {
        const isDuplicate = prev.some(
          (m) =>
            m.id === normalized.id ||
            (m.id.startsWith('temp-') &&
              m.content === normalized.content &&
              m.senderId === normalized.senderId)
        );
        if (isDuplicate) {
          return prev.map((m) =>
            m.id.startsWith('temp-') &&
            m.content === normalized.content &&
            m.senderId === normalized.senderId
              ? normalized
              : m
          );
        }
        return [...prev, normalized];
      });

      if (normalized.hasScamWarning) {
        setHasScamAlert(true);
      }
    };

    // 3. Scam Alert Listener
    const handleScamAlert = () => {
      setHasScamAlert(true);
    };

    // 4. Offer Updated Listener
    const handleOfferUpdated = (offer: Offer) => {
      setActiveOffer(offer);
    };

    // 5. Typing Listener
    const handleUserTyping = (data: { conversationId: string; isTyping: boolean }) => {
      if (data.conversationId === conversationId) {
        setIsTyping(data.isTyping);
      }
    };

    socket.on(SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
    socket.on(SOCKET_EVENTS.SCAM_ALERT, handleScamAlert);
    socket.on(SOCKET_EVENTS.OFFER_UPDATED, handleOfferUpdated);
    socket.on(SOCKET_EVENTS.USER_TYPING, handleUserTyping);

    return () => {
      socket.emit(SOCKET_EVENTS.LEAVE_CHAT, { conversationId });
      socket.off(SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
      socket.off(SOCKET_EVENTS.SCAM_ALERT, handleScamAlert);
      socket.off(SOCKET_EVENTS.OFFER_UPDATED, handleOfferUpdated);
      socket.off(SOCKET_EVENTS.USER_TYPING, handleUserTyping);
    };
  }, [conversationId]);

  // Send Message via Socket with HTTP Fallback
  const sendMessage = useCallback(
    async (content: string, type: 'text' | 'image' = 'text', mediaUrl?: string) => {
      if (!conversationId || conversationId === 'undefined') {
        toast.error('অবৈধ চ্যাট রুম');
        return;
      }

      const user = useAuthStore.getState().user;
      const optimisticMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversationId,
        senderId: user?.id || '',
        type,
        content,
        hasScamWarning: false,
        createdAt: new Date().toISOString(),
      };

      // Immediate UI feedback
      setMessages((prev) => [...prev, optimisticMsg]);

      const socket = getSocket();
      const payload = {
        conversationId,
        content,
        text: content,
        type,
        mediaUrl,
      };

      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.SEND_MESSAGE, payload, async (ack?: { success?: boolean }) => {
          if (!ack || ack.success === false) {
            try {
              await chatApi.sendMessage(conversationId, { content, type, mediaUrl });
            } catch (err) {
              console.error('HTTP fallback error:', err);
            }
          }
        });
      } else {
        try {
          await chatApi.sendMessage(conversationId, { content, type, mediaUrl });
        } catch (err) {
          console.error('HTTP send error:', err);
          toast.error('মেসেজ পাঠানো সম্ভব হয়নি');
        }
      }
    },
    [conversationId]
  );

  // Send Typing Indicator
  const sendTyping = useCallback(() => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.TYPING_START, { conversationId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId });
    }, 2000);
  }, [conversationId]);

  return {
    messages,
    setMessages,
    activeOffer,
    setActiveOffer,
    isTyping,
    hasScamAlert,
    sendMessage,
    sendTyping,
  };
}

export function useNotifications() {
  const { addNotification } = useNotificationStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const handlePriceDrop = (data: { title: string; newPrice: number }) => {
      toast.success(`📉 মূল্য হ্রাস: ${data.title} এখন ৳${data.newPrice.toLocaleString()}`);
    };

    const handleUserNotification = (notification: {
      id: string;
      type: string;
      title: string;
      message: string;
      createdAt: string;
    }) => {
      addNotification({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: false,
        createdAt: notification.createdAt,
      });
      toast(notification.title, { icon: '🔔' });
    };

    socket.on(SOCKET_EVENTS.PRICE_DROP_ALERT, handlePriceDrop);
    socket.on(SOCKET_EVENTS.USER_NOTIFICATION, handleUserNotification);

    return () => {
      socket.off(SOCKET_EVENTS.PRICE_DROP_ALERT, handlePriceDrop);
      socket.off(SOCKET_EVENTS.USER_NOTIFICATION, handleUserNotification);
    };
  }, [user, addNotification]);
}

