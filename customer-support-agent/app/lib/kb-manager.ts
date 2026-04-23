/**
 * Knowledge Base Manager
 * Handles upload, processing, and management of knowledge base documents
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { getEmbedding } from '@/lib/embeddings';
import { prisma } from '@/lib/prisma';

const MAX_CHUNK_SIZE = 800; // Characters per chunk
const CHUNK_OVERLAP = 100; // Overlap between chunks for context

export interface UploadKBParams {
  text: string;
  fileName: string;
  originalName: string;
  knowledgeBaseId: string;
  uploadedBy: string;
  fileSize: number;
  mimeType?: string;
}

export interface ChunkResult {
  text: string;
  index: number;
}

/**
 * Chunk text into smaller pieces with overlap
 */
export function chunkText(text: string, maxSize = MAX_CHUNK_SIZE, overlap = CHUNK_OVERLAP): ChunkResult[] {
  // Clean text
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Split by sentences
  const sentences = cleanedText.split(/[.!?]+\s+/);
  const chunks: ChunkResult[] = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence) continue;

    // If adding this sentence exceeds max size, save current chunk
    if (currentChunk.length + sentence.length > maxSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex,
      });
      chunkIndex++;

      // Start new chunk with overlap (last N characters of previous chunk)
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + ' ' + sentence + '. ';
    } else {
      currentChunk += sentence + '. ';
    }
  }

  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex,
    });
  }

  return chunks;
}

/**
 * Upload document to knowledge base
 */
export async function uploadToKnowledgeBase(params: UploadKBParams): Promise<{
  success: boolean;
  documentId?: string;
  chunksUploaded?: number;
  error?: string;
}> {
  const { text, fileName, originalName, knowledgeBaseId, uploadedBy, fileSize, mimeType } = params;

  try {
    // Create document record
    const document = await prisma.knowledgeBaseDocument.create({
      data: {
        fileName,
        originalName,
        knowledgeBaseId,
        uploadedBy,
        fileSize,
        mimeType,
        chunkCount: 0, // Will update after processing
        status: 'PROCESSING',
      },
    });

    console.log(`📄 Created KB document: ${document.id}`);

    // Chunk text
    const chunks = chunkText(text);
    console.log(`✂️  Split into ${chunks.length} chunks`);

    if (chunks.length === 0) {
      await prisma.knowledgeBaseDocument.update({
        where: { id: document.id },
        data: {
          status: 'FAILED',
          errorMessage: 'No content found in document',
        },
      });
      return {
        success: false,
        error: 'No content found in document',
      };
    }

    // Initialize Pinecone
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    const pineconeIds: string[] = [];

    // Embed and upload chunks in batches (to avoid rate limits)
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);

      // Process batch in parallel
      const batchPromises = batch.map(async (chunk) => {
        try {
          // Generate embedding
          const embedding = await getEmbedding(chunk.text);

          // Create unique ID for this chunk
          const vectorId = `${document.id}_chunk_${chunk.index}`;
          pineconeIds.push(vectorId);

          // Upsert to Pinecone
          await index.namespace(knowledgeBaseId).upsert([
            {
              id: vectorId,
              values: embedding,
              metadata: {
                text: chunk.text,
                documentId: document.id,
                fileName: originalName,
                chunkIndex: chunk.index,
                knowledgeBaseId,
                uploadedAt: new Date().toISOString(),
              },
            },
          ]);

          console.log(`  ✅ Chunk ${chunk.index + 1}/${chunks.length} uploaded`);
        } catch (error) {
          console.error(`  ❌ Failed to upload chunk ${chunk.index}:`, error);
          throw error;
        }
      });

      await Promise.all(batchPromises);

      // Small delay between batches to avoid rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Update document with success status
    await prisma.knowledgeBaseDocument.update({
      where: { id: document.id },
      data: {
        status: 'COMPLETED',
        chunkCount: chunks.length,
        pineconeNamespace: knowledgeBaseId,
        pineconeIds,
        processedAt: new Date(),
      },
    });

    console.log(`✅ Document uploaded successfully: ${chunks.length} chunks`);

    return {
      success: true,
      documentId: document.id,
      chunksUploaded: chunks.length,
    };
  } catch (error) {
    console.error('❌ Error uploading to knowledge base:', error);

    // Try to update document status if it exists
    try {
      const existingDoc = await prisma.knowledgeBaseDocument.findFirst({
        where: { fileName },
      });

      if (existingDoc) {
        await prisma.knowledgeBaseDocument.update({
          where: { id: existingDoc.id },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    } catch (updateError) {
      console.error('Failed to update document status:', updateError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete document from knowledge base
 */
export async function deleteFromKnowledgeBase(documentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Get document
    const document = await prisma.knowledgeBaseDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return { success: false, error: 'Document not found' };
    }

    // Delete from Pinecone
    if (document.pineconeIds && document.pineconeIds.length > 0) {
      const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
      const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

      await index.namespace(document.knowledgeBaseId).deleteMany(document.pineconeIds);
      console.log(`🗑️  Deleted ${document.pineconeIds.length} vectors from Pinecone`);
    }

    // Delete from database
    await prisma.knowledgeBaseDocument.delete({
      where: { id: documentId },
    });

    console.log(`✅ Document deleted: ${documentId}`);

    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting from knowledge base:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * List documents in knowledge base
 */
export async function listKBDocuments(knowledgeBaseId?: string) {
  try {
    const documents = await prisma.knowledgeBaseDocument.findMany({
      where: knowledgeBaseId ? { knowledgeBaseId } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      documents,
    };
  } catch (error) {
    console.error('Error listing KB documents:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'List failed',
    };
  }
}

/**
 * Get document by ID
 */
export async function getKBDocument(documentId: string) {
  try {
    const document = await prisma.knowledgeBaseDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return { success: false, error: 'Document not found' };
    }

    return {
      success: true,
      document,
    };
  } catch (error) {
    console.error('Error getting KB document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get document',
    };
  }
}

/**
 * Test RAG query on knowledge base
 */
export async function testKBQuery(query: string, knowledgeBaseId = 'default', topK = 5) {
  try {
    // Get embedding for query
    const queryEmbedding = await getEmbedding(query);

    // Search Pinecone
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    const results = await index.namespace(knowledgeBaseId).query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    // Format results
    const matches = results.matches.map((match) => ({
      score: match.score || 0,
      text: match.metadata?.text || '',
      fileName: match.metadata?.fileName || '',
      documentId: match.metadata?.documentId || '',
      chunkIndex: match.metadata?.chunkIndex || 0,
    }));

    return {
      success: true,
      query,
      matches,
      count: matches.length,
    };
  } catch (error) {
    console.error('Error testing KB query:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Query failed',
    };
  }
}

/**
 * Extract text from file buffer
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Handle different file types
  if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
    return buffer.toString('utf-8');
  }

  // For PDF, we'd need a library like pdf-parse
  // For now, just handle plain text and throw error for others
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    throw new Error('PDF support coming soon. Please convert to TXT for now.');
  }

  // Default: try to parse as text
  return buffer.toString('utf-8');
}
