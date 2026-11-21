import { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { socketClient } from '@/services/socket/socket.client';
import { useAuthStore } from '@/store/auth.store';

export function useSocket() {
  const { user, isAuthenticated } = useAuthStore();
  const [isConnected, setIsConnected] = useState(socketClient.isConnected());

  useEffect(() => {
    let checkInterval: any = null;

    if (isAuthenticated && user?.id) {
      socketClient.connect(user.id).then(() => {
        setIsConnected(socketClient.isConnected());
      });

      checkInterval = setInterval(() => {
        setIsConnected(socketClient.isConnected());
      }, 3000);
    } else {
      socketClient.disconnect();
      setIsConnected(false);
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated && user?.id) {
        if (!socketClient.isConnected()) {
          socketClient.connect(user.id).then(() => {
            setIsConnected(socketClient.isConnected());
          });
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      subscription.remove();
    };
  }, [isAuthenticated, user?.id]);

  return {
    socket: socketClient.getSocket(),
    isConnected,
    joinChat: (conversationId: string) => socketClient.joinChat(conversationId),
    leaveChat: (conversationId: string) => socketClient.leaveChat(conversationId),
    sendMessage: (conversationId: string, text: string) => socketClient.sendMessage(conversationId, text),
    startTyping: (conversationId: string) => socketClient.startTyping(conversationId),
    stopTyping: (conversationId: string) => socketClient.stopTyping(conversationId),
  };
}
