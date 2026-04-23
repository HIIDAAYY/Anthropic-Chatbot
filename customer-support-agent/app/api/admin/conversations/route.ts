import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/app/lib/admin-auth';
import { Prisma, ConversationStatus } from '@prisma/client';
import { withErrorHandler } from '@/app/lib/error-handler';
import { withQueryValidation } from '@/app/lib/validate-request';
import { ConversationsListQuerySchema } from '@/app/lib/schemas/admin';

export const GET = withErrorHandler(
  withQueryValidation(ConversationsListQuerySchema, async (query) => {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { search, status } = query;
    const page: number = query.page ?? 1;
    const limit: number = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.ConversationWhereInput = {};

    if (status && status !== 'ALL') {
      where.status = status as ConversationStatus;
    }

    if (search) {
      where.customer = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          customer: true,
          messages: { orderBy: { timestamp: 'desc' }, take: 1 },
          _count: { select: { messages: true } },
        },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ]);

    const formattedConversations = conversations.map((conv) => ({
      ...conv,
      lastMessage: conv.messages[0],
      messageCount: conv._count.messages,
    }));

    return NextResponse.json({
      conversations: formattedConversations,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  })
);
