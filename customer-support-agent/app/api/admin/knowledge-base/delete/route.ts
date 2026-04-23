import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/app/lib/admin-auth';
import { deleteFromKnowledgeBase } from '@/app/lib/kb-manager';

export async function DELETE(req: NextRequest) {
  try {
    // Check authentication
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get document ID from request body
    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Delete document
    const result = await deleteFromKnowledgeBase(documentId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete document' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Delete endpoint error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete document' },
      { status: 500 }
    );
  }
}
