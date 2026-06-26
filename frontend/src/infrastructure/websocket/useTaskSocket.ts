/**
 * useTaskSocket
 *
 * A React hook for task-level real-time updates via WebSocket.
 * - Connects to ws://localhost:8000/ws/notifications/?organization_id=...&token=...
 * - On `type === 'task_update'` events, invalidates the ['tasks'] TanStack Query cache
 * - Returns: { isConnected }
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthStore } from "@/infrastructure/store/auth-store";
import { queryClient } from "@/infrastructure/query/query-client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WS_BASE = "ws://localhost:8000";
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskUpdateEvent {
  type: string;
  [key: string]: unknown;
}

export interface UseTaskSocketReturn {
  isConnected: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTaskSocket(): UseTaskSocketReturn {
  const activeOrganizationId = useAuthStore((s) => s.activeOrganizationId);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const socketRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef<number>(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const [isConnected, setIsConnected] = useState(false);

  // -------------------------------------------------------------------------
  // connect()
  // -------------------------------------------------------------------------
  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ts_access") ?? ""
        : "";

    if (!activeOrganizationId || !token) return;

    // Tear down any existing socket
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.close();
      socketRef.current = null;
    }

    const url = `${WS_BASE}/ws/notifications/?organization_id=${activeOrganizationId}&token=${token}`;
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) return;
      console.log("[useTaskSocket] ✅ Connected");
      setIsConnected(true);
      retryCountRef.current = 0;
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!isMountedRef.current) return;
      try {
        const data = JSON.parse(event.data as string) as TaskUpdateEvent;
        if (data.type === "task_update") {
          // Invalidate all task queries so UI re-fetches fresh data
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
        }
      } catch (err) {
        console.warn("[useTaskSocket] Failed to parse message:", err);
      }
    };

    ws.onerror = (err) => {
      console.warn("[useTaskSocket] ⚠️ Socket error:", err);
    };

    ws.onclose = (closeEvent) => {
      if (!isMountedRef.current) return;
      console.warn(
        `[useTaskSocket] 🔌 Disconnected (code ${closeEvent.code})`
      );
      setIsConnected(false);

      if (retryCountRef.current < MAX_RETRIES) {
        const delay = BASE_BACKOFF_MS * 2 ** retryCountRef.current;
        retryCountRef.current += 1;
        console.info(
          `[useTaskSocket] ↩️ Reconnect attempt ${retryCountRef.current}/${MAX_RETRIES} in ${delay}ms`
        );
        retryTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) connect();
        }, delay);
      } else {
        console.error("[useTaskSocket] ❌ Max retries reached — giving up.");
      }
    };
  }, [activeOrganizationId]);

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------
  useEffect(() => {
    isMountedRef.current = true;

    if (isAuthenticated && activeOrganizationId) {
      retryCountRef.current = 0;
      connect();
    }

    return () => {
      isMountedRef.current = false;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [isAuthenticated, activeOrganizationId, connect]);

  return { isConnected };
}

export default useTaskSocket;
