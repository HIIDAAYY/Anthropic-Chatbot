import { getSessionUser } from '@/app/lib/admin-auth';

// In-memory event bus — works for local demo; use Redis pub/sub for production/Vercel
const clients = new Set<ReadableStreamDefaultController>();

export function broadcastSSEEvent(event: { type: string; payload: any }) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  clients.forEach(c => {
    try { c.enqueue(new TextEncoder().encode(data)); }
    catch { clients.delete(c); }
  });
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  let ctrl: ReadableStreamDefaultController;
  const stream = new ReadableStream({
    start(c) {
      ctrl = c;
      clients.add(c);
      c.enqueue(new TextEncoder().encode(': connected\n\n'));
    },
    cancel() {
      clients.delete(ctrl);
    },
  });

  const ping = setInterval(() => {
    try { ctrl.enqueue(new TextEncoder().encode(': ping\n\n')); }
    catch { clearInterval(ping); }
  }, 25000);

  request.signal.addEventListener('abort', () => {
    clearInterval(ping);
    clients.delete(ctrl);
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
