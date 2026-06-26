/**
 * useNotificationSocket
 *
 * A production-grade React hook for real-time WebSocket notifications.
 * - Reads org ID & access token from Zustand auth store / localStorage
 * - Opens ws://localhost:8000/ws/notifications/?organization_id=...&token=...
 * - Calls `onMessage` callback on every parsed event
 * - Reconnects on close/error with exponential backoff (max 5 retries)
 * - Cleans up on unmount
 * - Returns: { isConnected, lastEvent, reconnectCount }
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthStore } from "@/infrastructure/store/auth-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationEvent {
  type: "notification" | string;
  id: string;
  title: string;
  message: string;
  notification_type: string;
  created_at: string;
  [key: string]: unknown;
}

export interface UseNotificationSocketOptions {
  /** Called for every successfully parsed WebSocket message frame */
  onMessage?: (event: NotificationEvent) => void;
}

export interface UseNotificationSocketReturn {
  isConnected: boolean;
  lastEvent: NotificationEvent | null;
  reconnectCount: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WS_BASE = "ws://localhost:8000";
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1_000;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNotificationSocket(
  options: UseNotificationSocketOptions = {}
): UseNotificationSocketReturn {
  const { onMessage } = options;

  // Auth state from Zustand
  const activeOrganizationId = useAuthStore((s) => s.activeOrganizationId);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Refs — avoid stale closures in event handlers
  const socketRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef<number>(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMessageRef = useRef(onMessage);
  const isMountedRef = useRef(true);

  // Keep onMessage ref fresh without triggering reconnection
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // Reactive state exposed to consumers
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<NotificationEvent | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  // -------------------------------------------------------------------------
  // connect() — creates (or replaces) the WebSocket
  // -------------------------------------------------------------------------
  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    // Read token from localStorage (key used by auth-store: "ts_access")
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ts_access") ?? ""
        : "";

    if (!activeOrganizationId || !token) return;

    // Close any stale socket before opening a new one
    if (socketRef.current) {
      socketRef.current.onclose = null; // prevent spurious reconnect loop
      socketRef.current.close();
      socketRef.current = null;
    }

    const url = `${WS_BASE}/ws/notifications/?organization_id=${activeOrganizationId}&token=${token}`;
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) return;
      console.log("[useNotificationSocket] ✅ Connected");
      setIsConnected(true);
      retryCountRef.current = 0;
      setReconnectCount(0);
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!isMountedRef.current) return;
      try {
        const data = JSON.parse(event.data as string) as NotificationEvent;
        setLastEvent(data);
        onMessageRef.current?.(data);
      } catch (err) {
        console.warn("[useNotificationSocket] Failed to parse message:", err);
      }
    };

    ws.onerror = (err) => {
      console.warn("[useNotificationSocket] ⚠️ Socket error:", err);
      // onclose will fire immediately after onerror — reconnect logic lives there
    };

    ws.onclose = (closeEvent) => {
      if (!isMountedRef.current) return;
      console.warn(
        `[useNotificationSocket] 🔌 Disconnected (code ${closeEvent.code})`
      );
      setIsConnected(false);

      // Attempt reconnect with exponential backoff
      if (retryCountRef.current < MAX_RETRIES) {
        const delay = BASE_BACKOFF_MS * 2 ** retryCountRef.current;
        retryCountRef.current += 1;
        setReconnectCount(retryCountRef.current);
        console.info(
          `[useNotificationSocket] ↩️ Reconnect attempt ${retryCountRef.current}/${MAX_RETRIES} in ${delay}ms`
        );
        retryTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) connect();
        }, delay);
      } else {
        console.error(
          "[useNotificationSocket] ❌ Max retries reached — giving up."
        );
      }
    };
  }, [activeOrganizationId]); // only reconnect when org changes

  // -------------------------------------------------------------------------
  // Effect — open / close based on auth
  // -------------------------------------------------------------------------
  useEffect(() => {
    isMountedRef.current = true;

    if (isAuthenticated && activeOrganizationId) {
      retryCountRef.current = 0;
      connect();
    }

    return () => {
      isMountedRef.current = false;
      // Cancel any pending reconnect timer
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      // Close the socket cleanly — suppress reconnect via null guard on isMounted
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [isAuthenticated, activeOrganizationId, connect]);

  return { isConnected, lastEvent, reconnectCount };
}

export default useNotificationSocket;
