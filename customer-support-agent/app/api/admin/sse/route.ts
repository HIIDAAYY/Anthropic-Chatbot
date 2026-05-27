import { getSessionUser } from '@/app/lib/admin-auth';
import { sseClients } from '@/app/lib/sse-bus';

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  let pingInterval: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(c) {
      sseClients.add(c);
      c.enqueue(new TextEncoder().encode(': connected\n\n'));

      pingInterval = setInterval(() => {
        try { c.enqueue(new TextEncoder().encode(': ping\n\n')); }
        catch { clearInterval(pingInterval); sseClients.delete(c); }
      }, 25000);

      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        sseClients.delete(c);
      });
    },
    cancel() {
      clearInterval(pingInterval);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
