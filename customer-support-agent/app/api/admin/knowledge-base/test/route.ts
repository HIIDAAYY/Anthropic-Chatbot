import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/app/lib/admin-auth';
import { testKBQuery } from '@/app/lib/kb-manager';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query from request body
    const { query, knowledgeBaseId, topK } = await req.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Test query
    const result = await testKBQuery(
      query,
      knowledgeBaseId || 'default',
      topK || 5
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Query failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      query: result.query,
      matches: result.matches,
      count: result.count,
    });
  } catch (error) {
    console.error('Test query endpoint error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Query failed' },
      { status: 500 }
    );
  }
}
