import { KanbanBoard } from "@/components/kanban-board";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function KanbanPage() {
  const leads = await prisma.lead.findMany({
    select: {
      id: true,
      companyName: true,
      responsibleName: true,
      pipelineStage: true,
      segment: true,
      source: true,
      offeredService: true,
      city: true,
      whatsapp: true,
      instagram: true,
      proposedValue: true,
      nextFollowUpAt: true
    },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <div className="grid gap-6">
      <PageHeader title="Pipeline comercial" subtitle="Acompanhe etapas, valores propostos, filtros e próximos follow-ups." />
      <KanbanBoard leads={leads.map((lead) => ({ ...lead, proposedValue: lead.proposedValue?.toString() ?? null }))} />
    </div>
  );
}
