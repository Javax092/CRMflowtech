import { Prisma } from "@prisma/client";

export const demoExistsWhere: Prisma.LeadWhereInput = {
  OR: [
    {
      AND: [
        { demoUrl: { not: null } },
        { demoUrl: { not: "" } }
      ]
    },
    {
      AND: [
        { demoSlug: { not: null } },
        { demoSlug: { not: "" } }
      ]
    }
  ]
};

export const demoMissingWhere: Prisma.LeadWhereInput = {
  NOT: demoExistsWhere
};

export function hasDemo(lead: { demoUrl?: string | null; demoSlug?: string | null }) {
  return Boolean(lead.demoUrl?.trim() || lead.demoSlug?.trim());
}

export function leadDemoSortRank(lead: { status: string; demoUrl?: string | null; demoSlug?: string | null }) {
  if (hasDemo(lead)) return 3;
  if (lead.status === "CONTACTED") return 1;
  if (lead.status === "NEW") return 2;
  return 4;
}

export async function getLeadDemoStatus(prisma: Prisma.TransactionClient | Prisma.DefaultPrismaClient) {
  const [totalLeads, novoLead, abordado, comDemo, semDemo, novoLeadComDemo, novoLeadSemDemo, abordadoComDemo, abordadoSemDemo] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.lead.count({ where: { status: "CONTACTED" } }),
    prisma.lead.count({ where: demoExistsWhere }),
    prisma.lead.count({ where: demoMissingWhere }),
    prisma.lead.count({ where: { status: "NEW", AND: [demoExistsWhere] } }),
    prisma.lead.count({ where: { status: "NEW", AND: [demoMissingWhere] } }),
    prisma.lead.count({ where: { status: "CONTACTED", AND: [demoExistsWhere] } }),
    prisma.lead.count({ where: { status: "CONTACTED", AND: [demoMissingWhere] } })
  ]);

  return {
    totalLeads,
    novoLead,
    abordado,
    comDemo,
    semDemo,
    novoLeadComDemo,
    novoLeadSemDemo,
    abordadoComDemo,
    abordadoSemDemo
  };
}
