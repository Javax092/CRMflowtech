CREATE TYPE "FollowUpSequenceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELED');

ALTER TYPE "ScriptType" ADD VALUE IF NOT EXISTS 'FOLLOW_UP_3';

ALTER TABLE "Lead"
ADD COLUMN "firstMessageSentAt" TIMESTAMP(3),
ADD COLUMN "followUpCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "followUpSequenceLength" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "followUpSequenceStatus" "FollowUpSequenceStatus" NOT NULL DEFAULT 'CANCELED',
ADD COLUMN "lastFollowUpAt" TIMESTAMP(3),
ADD COLUMN "nextAction" TEXT;

CREATE INDEX "Lead_followUpSequenceStatus_idx" ON "Lead"("followUpSequenceStatus");
