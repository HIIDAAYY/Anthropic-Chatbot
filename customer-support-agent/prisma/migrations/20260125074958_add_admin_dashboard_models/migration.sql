-- CreateEnum
CREATE TYPE "HandoffStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED');

-- CreateTable
CREATE TABLE "conversation_handoffs" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "assigned_agent_id" TEXT,
    "status" "HandoffStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "handoff_reason" TEXT,
    "resolution_notes" TEXT,
    "internal_notes" TEXT,
    "handoff_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "conversation_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "related_conversation_id" TEXT,
    "related_handoff_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_handoffs_conversation_id_key" ON "conversation_handoffs"("conversation_id");

-- CreateIndex
CREATE INDEX "conversation_handoffs_status_idx" ON "conversation_handoffs"("status");

-- CreateIndex
CREATE INDEX "conversation_handoffs_priority_idx" ON "conversation_handoffs"("priority");

-- CreateIndex
CREATE INDEX "conversation_handoffs_assigned_agent_id_idx" ON "conversation_handoffs"("assigned_agent_id");

-- CreateIndex
CREATE INDEX "notifications_agent_id_idx" ON "notifications"("agent_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- AddForeignKey
ALTER TABLE "conversation_handoffs" ADD CONSTRAINT "conversation_handoffs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_handoffs" ADD CONSTRAINT "conversation_handoffs_assigned_agent_id_fkey" FOREIGN KEY ("assigned_agent_id") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
