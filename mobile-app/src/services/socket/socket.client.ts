import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/utils/constants';
import { getAccessToken } from '@/utils/storage';
import { SOCKET_EVENTS } from './socket.events';
import {
  SocketNewMessagePayload,
  SocketScamAlertPayload,
  SocketOfferUpdatedPayload,
  SocketPriceDropPayload,
  SocketUserNotificationPayload,
} from '@/types/chat.types';

class SocketService {
  private socket: Socket | null = null;
  private isConnecting = false;
  private currentUserId: string | null = null;

  public async connect(userId: string): Promise<Socket | null> {
    if (this.socket && this.socket.connected && this.currentUserId === userId) {
      return this.socket;
    }

    if (this.isConnecting) return null;
    this.isConnecting = true;
    this.currentUserId = userId;

    const token = await getAccessToken();
    if (!token) {
      this.isConnecting = false;
      return null;
    }

    try {
      if (this.socket) {
        this.socket.disconnect();
      }

      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        // Join personal user events room
        if (this.currentUserId) {
          this.socket?.emit('join_room', { room: `user:events_${this.currentUserId}` });
        }
      });

      this.socket.on('connect_error', (error) => {
        if (error.message?.includes('UNAUTHORIZED') || error.message?.includes('jwt')) {
          // Token expired or invalid
          this.disconnect();
        }
      });

      this.socket.on('disconnect', (reason) => {
        // Socket disconnected
      });

      return this.socket;
    } catch {
      return null;
    } finally {
      this.isConnecting = false;
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentUserId = null;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  // Room Subscription
  public joinChat(conversationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.JOIN_CHAT, { conversationId });
    }
  }

  public leaveChat(conversationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.LEAVE_CHAT, { conversationId });
    }
  }

  // Message Sending
  public sendMessage(conversationId: string, text: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.SEND_MESSAGE, { conversationId, text });
    }
  }

  // Typing Indicators
  public startTyping(conversationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.TYPING_START, { conversationId });
    }
  }

  public stopTyping(conversationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId });
    }
  }

  // Event Listeners
  public onNewMessage(callback: (msg: SocketNewMessagePayload) => void): () => void {
    this.socket?.on(SOCKET_EVENTS.NEW_MESSAGE, callback);
    return () => {
      this.socket?.off(SOCKET_EVENTS.NEW_MESSAGE, callback);
    };
  }

  public onScamAlert(callback: (data: SocketScamAlertPayload) => void): () => void {
    this.socket?.on(SOCKET_EVENTS.SCAM_ALERT, callback);
    return () => {
      this.socket?.off(SOCKET_EVENTS.SCAM_ALERT, callback);
    };
  }

  public onTypingIndicator(callback: (data: { conversationId: string; isTyping: boolean }) => void): () => void {
    const handleStart = (data: { conversationId: string }) => {
      callback({ conversationId: data.conversationId, isTyping: true });
    };
    const handleStop = (data: { conversationId: string }) => {
      callback({ conversationId: data.conversationId, isTyping: false });
    };

    this.socket?.on(SOCKET_EVENTS.TYPING_START, handleStart);
    this.socket?.on(SOCKET_EVENTS.TYPING_STOP, handleStop);

    return () => {
      this.socket?.off(SOCKET_EVENTS.TYPING_START, handleStart);
      this.socket?.off(SOCKET_EVENTS.TYPING_STOP, handleStop);
    };
  }

  public onOfferUpdated(callback: (payload: SocketOfferUpdatedPayload) => void): () => void {
    this.socket?.on(SOCKET_EVENTS.OFFER_UPDATED, callback);
    return () => {
      this.socket?.off(SOCKET_EVENTS.OFFER_UPDATED, callback);
    };
  }

  public onPriceDropAlert(callback: (payload: SocketPriceDropPayload) => void): () => void {
    this.socket?.on(SOCKET_EVENTS.PRICE_DROP_ALERT, callback);
    return () => {
      this.socket?.off(SOCKET_EVENTS.PRICE_DROP_ALERT, callback);
    };
  }

  public onUserNotification(callback: (payload: SocketUserNotificationPayload) => void): () => void {
    this.socket?.on(SOCKET_EVENTS.USER_NOTIFICATION, callback);
    return () => {
      this.socket?.off(SOCKET_EVENTS.USER_NOTIFICATION, callback);
    };
  }
}

export const socketClient = new SocketService();
