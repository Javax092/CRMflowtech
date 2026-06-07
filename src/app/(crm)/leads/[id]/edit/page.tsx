import { notFound } from "next/navigation";
import { LeadForm } from "@/components/lead-form";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) notFound();

  return (
    <div className="grid gap-6">
      <PageHeader title="Editar lead" subtitle="Atualize dados comerciais e próximos passos." />
      <LeadForm lead={{ ...lead, proposedValue: lead.proposedValue?.toString() ?? null }} />
    </div>
  );
}
