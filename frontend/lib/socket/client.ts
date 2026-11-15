import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/store/auth.store';

let socket: Socket | null = null;

export function getSocket(): Socket {
  const token = useAuthStore.getState().accessToken;
  let wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const protocol = window.location.protocol;
      wsUrl = `${protocol}//${hostname}:5000`;
    }
  }

  if (!socket) {
    socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  } else if (token && socket.auth) {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

