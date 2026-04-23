import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/app/lib/admin-auth';
import { listKBDocuments } from '@/app/lib/kb-manager';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(req.url);
    const knowledgeBaseId = searchParams.get('knowledgeBaseId') || undefined;

    // List documents
    const result = await listKBDocuments(knowledgeBaseId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to list documents' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documents: result.documents,
      count: result.documents?.length || 0,
    });
  } catch (error) {
    console.error('List endpoint error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list documents' },
      { status: 500 }
    );
  }
}
