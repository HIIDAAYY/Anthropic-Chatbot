/**
 * Health Check Endpoint
 * GET /api/health
 * Returns status of all critical services
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db-service';
import { Pinecone } from '@pinecone-database/pinecone';
import Anthropic from '@anthropic-ai/sdk';

export async function GET(req: NextRequest) {
  const checks: Record<string, { status: string; message?: string; latency?: number }> = {};

  // 1. Check Database Connection
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;
    checks.database = {
      status: 'healthy',
      message: 'Connected to PostgreSQL',
      latency: dbLatency,
    };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      message: (error as Error).message,
    };
  }

  // 2. Check Pinecone Connection
  try {
    const pineconeStart = Date.now();
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });
    const indexName = process.env.PINECONE_INDEX_NAME || 'anthropicchatbot';
    const index = pinecone.index(indexName);

    // Try to get index stats
    await index.describeIndexStats();
    const pineconeLatency = Date.now() - pineconeStart;

    checks.pinecone = {
      status: 'healthy',
      message: `Connected to index: ${indexName}`,
      latency: pineconeLatency,
    };
  } catch (error) {
    checks.pinecone = {
      status: 'unhealthy',
      message: (error as Error).message,
    };
  }

  // 3. Check Claude API
  try {
    const claudeStart = Date.now();
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Simple test: list models (lightweight operation)
    // Note: Anthropic SDK doesn't expose model listing, so we just check if we can instantiate
    const claudeLatency = Date.now() - claudeStart;

    checks.claude = {
      status: process.env.ANTHROPIC_API_KEY ? 'healthy' : 'unhealthy',
      message: process.env.ANTHROPIC_API_KEY
        ? 'API key configured'
        : 'API key missing',
      latency: claudeLatency,
    };
  } catch (error) {
    checks.claude = {
      status: 'unhealthy',
      message: (error as Error).message,
    };
  }

  // 4. Check Environment Variables
  const requiredEnvVars = [
    'ANTHROPIC_API_KEY',
    'PINECONE_API_KEY',
    'PINECONE_INDEX_NAME',
    'DATABASE_URL',
  ];

  const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);

  checks.environment = {
    status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
    message:
      missingEnvVars.length === 0
        ? 'All required environment variables configured'
        : `Missing: ${missingEnvVars.join(', ')}`,
  };

  // Overall status
  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');
  const overallStatus = allHealthy ? 'healthy' : 'degraded';

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
