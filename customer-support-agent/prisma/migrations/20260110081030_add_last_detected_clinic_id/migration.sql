-- CreateEnum (with error handling for existing types)
DO $$ BEGIN
    CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "LearnedQAStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SYNCED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BusinessType" AS ENUM ('BEAUTY_CLINIC', 'TRAVEL_AGENCY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ResourceType" AS ENUM ('DOCTOR', 'THERAPIST', 'ROOM', 'TOUR_GUIDE', 'VEHICLE', 'EQUIPMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BookingPaymentStatus" AS ENUM ('PENDING', 'SETTLEMENT', 'CAPTURE', 'DENY', 'CANCEL', 'EXPIRE', 'REFUND', 'PARTIAL_REFUND');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MidtransPaymentType" AS ENUM ('BANK_TRANSFER', 'GOPAY', 'QRIS', 'SHOPEEPAY', 'CREDIT_CARD', 'ECHANNEL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ReminderMethod" AS ENUM ('WHATSAPP', 'EMAIL', 'SMS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SalesFunnelStage" AS ENUM ('AWARENESS', 'INTEREST', 'CONSIDERATION', 'INTENT', 'BOOKING', 'PAYMENT', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PromoType" AS ENUM ('PERCENTAGE_DISCOUNT', 'FIXED_AMOUNT', 'BUNDLE_PACKAGE', 'FIRST_TIMER_SPECIAL', 'LIMITED_TIME_FLASH', 'LOYALTY_REWARD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable (with error handling for existing columns)
DO $$ BEGIN
    ALTER TABLE "conversation_metadata" ADD COLUMN "conversion_probability" DOUBLE PRECISION;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversation_metadata" ADD COLUMN "conversion_revenue" INTEGER;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversation_metadata" ADD COLUMN "conversion_time" TIMESTAMP(3);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversation_metadata" ADD COLUMN "converted_to_booking" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversation_metadata" ADD COLUMN "intent_score" INTEGER DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversation_metadata" ADD COLUMN "last_detected_clinic_id" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversation_metadata" ADD COLUMN "learned_at" TIMESTAMP(3);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversation_metadata" ADD COLUMN "learning_eligible" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversation_metadata" ADD COLUMN "linked_booking_id" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversation_metadata" ADD COLUMN "objections_faced" TEXT[] DEFAULT ARRAY[]::TEXT[];
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversation_metadata" ADD COLUMN "promos_offered" TEXT[] DEFAULT ARRAY[]::TEXT[];
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversation_metadata" ADD COLUMN "quality_score" DOUBLE PRECISION;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversation_metadata" ADD COLUMN "sales_stage" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversation_metadata" ADD COLUMN "services_interested" TEXT[] DEFAULT ARRAY[]::TEXT[];
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversation_metadata" ADD COLUMN "upsells_shown" TEXT[] DEFAULT ARRAY[]::TEXT[];
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminSession" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "learned_qa_pairs" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "source_message_ids" TEXT[],
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "quality_score" DOUBLE PRECISION NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "status" "LearnedQAStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "pinecone_id" TEXT,
    "synced_at" TIMESTAMP(3),
    "extracted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learned_qa_pairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sales_funnel_logs" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "from_stage" "SalesFunnelStage" NOT NULL,
    "to_stage" "SalesFunnelStage" NOT NULL,
    "intent_score_before" INTEGER NOT NULL,
    "intent_score_after" INTEGER NOT NULL,
    "trigger_action" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_funnel_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "promo_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "PromoType" NOT NULL,
    "discount_value" INTEGER NOT NULL,
    "description" TEXT,
    "applicable_services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "min_purchase_amount" INTEGER,
    "max_usage_count" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "valid_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "conversation_id" TEXT,
    "customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "upsell_attempts" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "original_service_id" TEXT NOT NULL,
    "suggested_service_id" TEXT NOT NULL,
    "upsell_type" TEXT NOT NULL,
    "reason_shown" TEXT NOT NULL,
    "price_difference" INTEGER,
    "was_accepted" BOOLEAN NOT NULL DEFAULT false,
    "accepted_at" TIMESTAMP(3),
    "shown_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upsell_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "businesses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BusinessType" NOT NULL,
    "phone_number" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "business_hours" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "business_settings" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "advance_booking_days" INTEGER NOT NULL DEFAULT 30,
    "min_notice_hours" INTEGER NOT NULL DEFAULT 24,
    "slot_duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "reminder_hours_before" INTEGER NOT NULL DEFAULT 24,
    "enable_whatsapp_reminder" BOOLEAN NOT NULL DEFAULT true,
    "require_deposit_percent" INTEGER,

    CONSTRAINT "business_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "services" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "price" INTEGER NOT NULL,
    "deposit_amount" INTEGER,
    "duration_minutes" INTEGER NOT NULL,
    "required_resources" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "resources" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "availability" JSONB NOT NULL,
    "metadata" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bookings" (
    "id" TEXT NOT NULL,
    "booking_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "booking_date" TIMESTAMP(3) NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_email" TEXT,
    "notes" TEXT,
    "total_amount" INTEGER NOT NULL,
    "deposit_amount" INTEGER,
    "cancellation_reason" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "promo_code_id" TEXT,
    "discount_amount" INTEGER,
    "original_amount" INTEGER,
    "source_conversation_id" TEXT,
    "upsell_services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "booking_resources" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,

    CONSTRAINT "booking_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "booking_payments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paid_amount" INTEGER NOT NULL DEFAULT 0,
    "payment_type" "MidtransPaymentType" NOT NULL,
    "status" "BookingPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "midtrans_order_id" TEXT,
    "midtrans_transaction_id" TEXT,
    "payment_url" TEXT,
    "va_number" TEXT,
    "bank" TEXT,
    "ewallet_type" TEXT,
    "qris_url" TEXT,
    "paid_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "refund_amount" INTEGER,
    "refunded_at" TIMESTAMP(3),
    "refund_reason" TEXT,
    "webhook_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "blackout_dates" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "blackout_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "booking_reminders" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "method" "ReminderMethod" NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminAuditLog_adminUserId_idx" ON "AdminAuditLog"("adminUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminAuditLog_timestamp_idx" ON "AdminAuditLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminSession_adminUserId_idx" ON "AdminSession"("adminUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminSession_tokenHash_idx" ON "AdminSession"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminUser_email_idx" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminUser_username_idx" ON "AdminUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "learned_qa_pairs_pinecone_id_key" ON "learned_qa_pairs"("pinecone_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "learned_qa_pairs_conversation_id_idx" ON "learned_qa_pairs"("conversation_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "learned_qa_pairs_status_idx" ON "learned_qa_pairs"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "learned_qa_pairs_quality_score_idx" ON "learned_qa_pairs"("quality_score");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "learned_qa_pairs_pinecone_id_idx" ON "learned_qa_pairs"("pinecone_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_funnel_logs_conversation_id_idx" ON "sales_funnel_logs"("conversation_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_funnel_logs_to_stage_idx" ON "sales_funnel_logs"("to_stage");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_funnel_logs_created_at_idx" ON "sales_funnel_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "promo_codes_code_key" ON "promo_codes"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "promo_codes_code_idx" ON "promo_codes"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "promo_codes_is_active_idx" ON "promo_codes"("is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "promo_codes_valid_until_idx" ON "promo_codes"("valid_until");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "promo_codes_conversation_id_idx" ON "promo_codes"("conversation_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "promo_codes_customer_id_idx" ON "promo_codes"("customer_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upsell_attempts_conversation_id_idx" ON "upsell_attempts"("conversation_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upsell_attempts_was_accepted_idx" ON "upsell_attempts"("was_accepted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upsell_attempts_shown_at_idx" ON "upsell_attempts"("shown_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upsell_attempts_upsell_type_idx" ON "upsell_attempts"("upsell_type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "businesses_phone_number_key" ON "businesses"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "business_settings_business_id_key" ON "business_settings"("business_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "services_business_id_idx" ON "services"("business_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "services_is_active_idx" ON "services"("is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "resources_business_id_idx" ON "resources"("business_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "resources_type_idx" ON "resources"("type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_booking_number_key" ON "bookings"("booking_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bookings_customer_id_idx" ON "bookings"("customer_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bookings_business_id_idx" ON "bookings"("business_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bookings_booking_number_idx" ON "bookings"("booking_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bookings_booking_date_idx" ON "bookings"("booking_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bookings_promo_code_id_idx" ON "bookings"("promo_code_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bookings_source_conversation_id_idx" ON "bookings"("source_conversation_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "booking_resources_booking_id_idx" ON "booking_resources"("booking_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "booking_resources_resource_id_idx" ON "booking_resources"("resource_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "booking_resources_booking_id_resource_id_key" ON "booking_resources"("booking_id", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "booking_payments_booking_id_key" ON "booking_payments"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "booking_payments_midtrans_order_id_key" ON "booking_payments"("midtrans_order_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "booking_payments_booking_id_idx" ON "booking_payments"("booking_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "booking_payments_status_idx" ON "booking_payments"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "booking_payments_midtrans_order_id_idx" ON "booking_payments"("midtrans_order_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blackout_dates_business_id_idx" ON "blackout_dates"("business_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blackout_dates_date_idx" ON "blackout_dates"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "booking_reminders_booking_id_idx" ON "booking_reminders"("booking_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "booking_reminders_scheduled_for_idx" ON "booking_reminders"("scheduled_for");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "booking_reminders_status_idx" ON "booking_reminders"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "conversation_metadata_learning_eligible_idx" ON "conversation_metadata"("learning_eligible");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "conversation_metadata_sales_stage_idx" ON "conversation_metadata"("sales_stage");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "conversation_metadata_converted_to_booking_idx" ON "conversation_metadata"("converted_to_booking");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "learned_qa_pairs" ADD CONSTRAINT "learned_qa_pairs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "sales_funnel_logs" ADD CONSTRAINT "sales_funnel_logs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "upsell_attempts" ADD CONSTRAINT "upsell_attempts_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "business_settings" ADD CONSTRAINT "business_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "services" ADD CONSTRAINT "services_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "resources" ADD CONSTRAINT "resources_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "booking_resources" ADD CONSTRAINT "booking_resources_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "booking_resources" ADD CONSTRAINT "booking_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "booking_payments" ADD CONSTRAINT "booking_payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "blackout_dates" ADD CONSTRAINT "blackout_dates_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "booking_reminders" ADD CONSTRAINT "booking_reminders_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

