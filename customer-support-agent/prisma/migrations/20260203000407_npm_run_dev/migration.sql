-- CreateEnum
CREATE TYPE "KBDocumentStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED', 'DELETED');

-- CreateTable
CREATE TABLE "knowledge_base_documents" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "knowledge_base_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT,
    "chunk_count" INTEGER NOT NULL,
    "status" "KBDocumentStatus" NOT NULL DEFAULT 'PROCESSING',
    "pinecone_namespace" TEXT,
    "pinecone_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "processed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_base_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_base_documents_knowledge_base_id_idx" ON "knowledge_base_documents"("knowledge_base_id");

-- CreateIndex
CREATE INDEX "knowledge_base_documents_uploaded_by_idx" ON "knowledge_base_documents"("uploaded_by");

-- CreateIndex
CREATE INDEX "knowledge_base_documents_status_idx" ON "knowledge_base_documents"("status");

-- CreateIndex
CREATE INDEX "knowledge_base_documents_created_at_idx" ON "knowledge_base_documents"("created_at");
