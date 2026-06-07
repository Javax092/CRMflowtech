-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'DEMO_CREATED', 'CONTACTED', 'RESPONDED', 'INTERESTED', 'MEETING_SCHEDULED', 'PROPOSAL_SENT', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "Segment" AS ENUM ('LAW', 'NUTRITION', 'VETERINARY', 'PETSHOP', 'CLINIC', 'RESTAURANT', 'OTHER');

-- CreateEnum
CREATE TYPE "OfferedService" AS ENUM ('WEBSITE', 'SYSTEM', 'AUTOMATION', 'SEO', 'MONTHLY_MAINTENANCE');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('INSTAGRAM', 'GOOGLE_MAPS', 'REFERRAL', 'WHATSAPP', 'MANUAL_LIST');

-- CreateEnum
CREATE TYPE "ContactEventType" AS ENUM ('FIRST_CONTACT', 'FOLLOW_UP', 'MEETING_SCHEDULED', 'PROPOSAL_SENT', 'CLIENT_REPLIED', 'CLIENT_WON', 'CLIENT_DECLINED');

-- CreateEnum
CREATE TYPE "ScriptType" AS ENUM ('FIRST_APPROACH', 'FOLLOW_UP_1', 'FOLLOW_UP_2', 'WEBSITE_PROPOSAL', 'SYSTEM_PROPOSAL', 'MONTHLY_PROPOSAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "responsibleName" TEXT,
    "companyName" TEXT,
    "segment" "Segment" NOT NULL,
    "instagram" TEXT,
    "instagramNormalized" TEXT,
    "whatsapp" TEXT,
    "whatsappNormalized" TEXT,
    "email" TEXT,
    "emailNormalized" TEXT,
    "city" TEXT,
    "websiteUrl" TEXT,
    "demoUrl" TEXT,
    "offeredService" "OfferedService" NOT NULL,
    "proposedValue" DECIMAL(12,2),
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" "LeadSource" NOT NULL DEFAULT 'MANUAL_LIST',
    "notes" TEXT,
    "firstContactAt" TIMESTAMP(3),
    "lastContactAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "followUpType" TEXT,
    "nextStepNote" TEXT,
    "companyNameNormalized" TEXT,
    "forceDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "ContactEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ScriptType" NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScriptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "won" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_instagramNormalized_key" ON "Lead"("instagramNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_whatsappNormalized_key" ON "Lead"("whatsappNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_emailNormalized_key" ON "Lead"("emailNormalized");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_nextFollowUpAt_idx" ON "Lead"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "Lead_companyNameNormalized_idx" ON "Lead"("companyNameNormalized");

-- CreateIndex
CREATE INDEX "FollowUp_dueAt_idx" ON "FollowUp"("dueAt");

-- CreateIndex
CREATE INDEX "FollowUp_completedAt_idx" ON "FollowUp"("completedAt");

-- AddForeignKey
ALTER TABLE "ContactHistory" ADD CONSTRAINT "ContactHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
