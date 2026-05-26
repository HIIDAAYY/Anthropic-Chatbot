'use client';
import { useEffect, useRef } from 'react';

export type SSEEvent = { type: string; payload: any };

export function useAdminSSE(onEvent: (e: SSEEvent) => void) {
  const ref = useRef(onEvent);
  ref.current = onEvent;

  useEffect(() => {
    let es: EventSource;
    const connect = () => {
      es = new EventSource('/api/admin/sse');
      es.onmessage = (e) => {
        if (!e.data || e.data.startsWith(':')) return;
        try { ref.current(JSON.parse(e.data)); } catch {}
      };
      es.onerror = () => {
        es.close();
        setTimeout(connect, 3000);
      };
    };
    connect();
    return () => es?.close();
  }, []);
}
