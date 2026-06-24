import { useEffect, useRef } from "react";
import { env } from "@/infrastructure/config/env";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { useNotificationStore, NotificationItem } from "../store/notification-store";

export const useNotificationSocket = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const { accessToken, activeOrganizationId, isAuthenticated } = useAuthStore();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    // Connect only if authenticated and active organization context is set
    if (!isAuthenticated || !activeOrganizationId || !accessToken) {
      if (socketRef.current) {
        socketRef.current.close();
      }
      return;
    }

    const wsUrl = `${env.NEXT_PUBLIC_WS_URL}/ws/notifications/?organization_id=${activeOrganizationId}`;
    
    // Instantiate WebSocket
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("🔌 Real-time Notification socket connected.");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Assuming socket returns raw notification objects
        if (data && data.id) {
          addNotification(data as NotificationItem);
        }
      } catch (err) {
        console.error("Failed to parse incoming notification frame:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket socket encounter error:", err);
    };

    ws.onclose = (event) => {
      console.log("🔌 Real-time Notification socket disconnected.", event.reason);
    };

    // Teardown connections on context switches or unmounts
    return () => {
      ws.close();
    };
  }, [isAuthenticated, activeOrganizationId, accessToken, addNotification]);

  return {
    socket: socketRef.current,
  };
};
export default useNotificationSocket;
