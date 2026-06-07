-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('LEAD_ENCONTRADO', 'DEMO_CRIADA', 'MENSAGEM_ENVIADA', 'RESPONDEU', 'REUNIAO_MARCADA', 'PROPOSTA_ENVIADA', 'NEGOCIACAO', 'FECHADO', 'PERDIDO');

-- AlterEnum
ALTER TYPE "ContactEventType" ADD VALUE 'MESSAGE_GENERATED';
ALTER TYPE "ContactEventType" ADD VALUE 'PIPELINE_CHANGED';
ALTER TYPE "ContactEventType" ADD VALUE 'DEMO_LINKED';

-- CreateTable
CREATE TABLE "DemoSite" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "stack" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoSite_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "pipelineStage" "PipelineStage" NOT NULL DEFAULT 'LEAD_ENCONTRADO';
ALTER TABLE "Lead" ADD COLUMN "demoSiteId" TEXT;

-- Backfill
UPDATE "Lead"
SET "pipelineStage" = CASE "status"
    WHEN 'DEMO_CREATED' THEN 'DEMO_CRIADA'::"PipelineStage"
    WHEN 'CONTACTED' THEN 'MENSAGEM_ENVIADA'::"PipelineStage"
    WHEN 'RESPONDED' THEN 'RESPONDEU'::"PipelineStage"
    WHEN 'INTERESTED' THEN 'NEGOCIACAO'::"PipelineStage"
    WHEN 'MEETING_SCHEDULED' THEN 'REUNIAO_MARCADA'::"PipelineStage"
    WHEN 'PROPOSAL_SENT' THEN 'PROPOSTA_ENVIADA'::"PipelineStage"
    WHEN 'WON' THEN 'FECHADO'::"PipelineStage"
    WHEN 'LOST' THEN 'PERDIDO'::"PipelineStage"
    ELSE 'LEAD_ENCONTRADO'::"PipelineStage"
END;

-- CreateIndex
CREATE INDEX "DemoSite_segment_idx" ON "DemoSite"("segment");
CREATE INDEX "DemoSite_status_idx" ON "DemoSite"("status");
CREATE INDEX "Lead_pipelineStage_idx" ON "Lead"("pipelineStage");
CREATE INDEX "Lead_demoSiteId_idx" ON "Lead"("demoSiteId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_demoSiteId_fkey" FOREIGN KEY ("demoSiteId") REFERENCES "DemoSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
