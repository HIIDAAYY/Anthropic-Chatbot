import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/app/lib/admin-auth';
import { uploadToKnowledgeBase, extractTextFromFile } from '@/app/lib/kb-manager';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const knowledgeBaseId = (formData.get('knowledgeBaseId') as string) || 'default';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf'];
    const allowedExtensions = ['.txt', '.md', '.pdf'];
    const isValidType =
      allowedTypes.includes(file.type) ||
      allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!isValidType) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload TXT, MD, or PDF files.' },
        { status: 400 }
      );
    }

    console.log(`📤 Uploading file: ${file.name} (${file.size} bytes)`);

    // Extract text from file
    let text: string;
    try {
      text = await extractTextFromFile(file);
    } catch (error) {
      console.error('Text extraction error:', error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Failed to extract text from file',
        },
        { status: 400 }
      );
    }

    // Validate extracted text
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'File appears to be empty or contains no readable text' },
        { status: 400 }
      );
    }

    if (text.length < 50) {
      return NextResponse.json(
        { error: 'File content is too short (minimum 50 characters)' },
        { status: 400 }
      );
    }

    console.log(`📝 Extracted ${text.length} characters from file`);

    // Generate filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedName}`;

    // Upload to knowledge base
    const result = await uploadToKnowledgeBase({
      text,
      fileName,
      originalName: file.name,
      knowledgeBaseId,
      uploadedBy: user.id,
      fileSize: file.size,
      mimeType: file.type,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Upload failed' },
        { status: 500 }
      );
    }

    console.log(`✅ Upload complete: ${result.chunksUploaded} chunks`);

    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      chunks: result.chunksUploaded,
      message: `Successfully uploaded ${result.chunksUploaded} chunks`,
    });
  } catch (error) {
    console.error('Upload endpoint error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}
