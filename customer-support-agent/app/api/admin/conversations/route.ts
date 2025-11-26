/**
 * Admin API: Get Pending Conversations
 * GET /api/admin/conversations?key=xxx
 * Returns all conversations that need agent action (redirected but not resolved)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPendingConversations } from '@/app/lib/db-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Simple auth check using query parameter
    const key = req.nextUrl.searchParams.get('key');

    if (!key || key !== process.env.ADMIN_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin key' },
        { status: 401 }
      );
    }

    console.log('📊 Fetching pending conversations for admin dashboard...');

    // Get all conversations pending agent action
    const conversations = await getPendingConversations();

    console.log(`✅ Found ${conversations.length} pending conversations`);
    console.log(`📋 Conversation IDs:`, conversations.map(c => `${c.id} (${c.status})`));

    // Create response with no-cache headers
    const response = NextResponse.json(conversations);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
