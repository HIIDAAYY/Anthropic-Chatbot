/**
 * Analytics API Endpoint
 * GET /api/analytics
 * Returns conversation analytics and statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData } from '@/app/lib/analytics-service';

export async function GET(req: NextRequest) {
  try {
    // Parse query parameters for time range
    const searchParams = req.nextUrl.searchParams;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const timeRange: { startDate?: Date; endDate?: Date } = {};

    if (startDateStr) {
      timeRange.startDate = new Date(startDateStr);
    }

    if (endDateStr) {
      timeRange.endDate = new Date(endDateStr);
    }

    // Get analytics data
    const data = await getDashboardData(
      startDateStr || endDateStr ? timeRange : undefined
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Analytics API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve analytics data',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
