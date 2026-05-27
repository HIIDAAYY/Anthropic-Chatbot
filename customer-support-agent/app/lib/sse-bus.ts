// In-memory event bus — works for local demo; use Redis pub/sub for production/Vercel
export const sseClients = new Set<ReadableStreamDefaultController>();

export function broadcastSSEEvent(event: { type: string; payload: any }) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  sseClients.forEach(c => {
    try { c.enqueue(new TextEncoder().encode(data)); }
    catch { sseClients.delete(c); }
  });
}
