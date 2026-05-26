'use client';
import { useEffect, useRef } from 'react';

export type SSEEvent = { type: string; payload: any };

export function useAdminSSE(onEvent: (e: SSEEvent) => void, enabled = true) {
  const ref = useRef(onEvent);
  ref.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    let es: EventSource;
    let retryTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      es = new EventSource('/api/admin/sse');
      es.onmessage = (e) => {
        if (!e.data) return;
        try { ref.current(JSON.parse(e.data)); }
        catch (err) {
          if (process.env.NODE_ENV === 'development') console.warn('[useAdminSSE] parse error', err);
        }
      };
      es.onerror = () => {
        es.close();
        retryTimer = setTimeout(connect, 3000);
      };
    };
    connect();

    return () => {
      clearTimeout(retryTimer);
      es?.close();
    };
  }, [enabled]);
}
