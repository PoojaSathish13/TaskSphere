"use client";
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/infrastructure/api/api-client';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotifications(): PushState {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      navigator.serviceWorker.ready.then(reg => {
        setRegistration(reg);
        reg.pushManager.getSubscription().then(sub => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setIsLoading(true);
    setError(null);
    try {
      if (!registration || !VAPID_PUBLIC_KEY) {
        // Fallback: Request native permissions if service worker config is not fully set
        if ('Notification' in window) {
          const perm = await Notification.requestPermission();
          setIsSubscribed(perm === 'granted');
          if (perm === 'granted') {
            new Notification('TaskSphere', { body: 'Push notifications enabled!', icon: '/favicon.ico' });
          }
        }
        return;
      }
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      await apiClient.post('/api/v1/notifications/push-subscribe/', subscription.toJSON());
      setIsSubscribed(true);
    } catch (err: any) {
      setError(err.message || 'Subscription failed');
    } finally {
      setIsLoading(false);
    }
  }, [registration]);

  const unsubscribe = useCallback(async () => {
    if (!registration) return;
    setIsLoading(true);
    try {
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await apiClient.post('/api/v1/notifications/push-unsubscribe/', { endpoint: sub.endpoint });
      }
      setIsSubscribed(false);
    } catch (err: any) {
      setError(err.message || 'Unsubscribe failed');
    } finally {
      setIsLoading(false);
    }
  }, [registration]);

  return { isSupported, isSubscribed, isLoading, error, subscribe, unsubscribe };
}
