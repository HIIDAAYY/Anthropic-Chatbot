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

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
