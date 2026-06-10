-- Add optional demo slug to leads without affecting existing records.
ALTER TABLE "Lead" ADD COLUMN "demoSlug" TEXT;
CREATE UNIQUE INDEX "Lead_demoSlug_key" ON "Lead"("demoSlug");
