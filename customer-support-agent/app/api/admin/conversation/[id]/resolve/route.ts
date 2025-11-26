/**
 * Admin API: Mark Conversation as Resolved
 * POST /api/admin/conversation/[id]/resolve?key=xxx
 * Marks a redirected conversation as resolved by agent
 */
import { NextRequest, NextResponse } from 'next/server';
import { markConversationResolved } from '@/app/lib/db-service';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Simple auth check using query parameter
    const key = req.nextUrl.searchParams.get('key');

    if (!key || key !== process.env.ADMIN_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin key' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await req.json();
    const { resolvedBy, notes } = body;

    if (!resolvedBy || !notes) {
      return NextResponse.json(
        { error: 'Missing required fields: resolvedBy and notes' },
        { status: 400 }
      );
    }

    console.log(`✅ Marking conversation ${id} as resolved by ${resolvedBy}`);

    // Mark conversation as resolved
    const result = await markConversationResolved(id, resolvedBy, notes);

    console.log(`✅ Conversation ${id} resolved successfully`);
    console.log(`✅ New status: ${result.status}`);

    const response = NextResponse.json({
      success: true,
      message: 'Conversation marked as resolved',
      conversationId: id,
      newStatus: result.status,
    });

    // Add no-cache headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('❌ Error resolving conversation:', error);
    return NextResponse.json(
      { error: 'Failed to resolve conversation' },
      { status: 500 }
    );
  }
}
