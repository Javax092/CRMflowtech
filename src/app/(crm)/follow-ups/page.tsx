import { endOfDay, endOfWeek, startOfDay } from "date-fns";
import { LeadStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui";
import { followUpStepLabel } from "@/lib/follow-up-sequence";
import { date } from "@/lib/format";
import { statusColors, statusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

async function groupFollowUps() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const whereBase: Prisma.LeadWhereInput = {
    status: { notIn: [LeadStatus.WON, LeadStatus.LOST] },
    nextFollowUpAt: { not: null }
  };
  const [overdue, today, week] = await Promise.all([
    prisma.lead.findMany({ where: { ...whereBase, nextFollowUpAt: { lt: todayStart } }, orderBy: { nextFollowUpAt: "asc" } }),
    prisma.lead.findMany({ where: { ...whereBase, nextFollowUpAt: { gte: todayStart, lte: todayEnd } }, orderBy: { nextFollowUpAt: "asc" } }),
    prisma.lead.findMany({ where: { ...whereBase, nextFollowUpAt: { gt: todayEnd, lte: weekEnd } }, orderBy: { nextFollowUpAt: "asc" } })
  ]);
  return { overdue, today, week };
}

export default async function FollowUpsPage() {
  const groups = await groupFollowUps();
  const sections = [
    ["Atrasados", groups.overdue],
    ["Hoje", groups.today],
    ["Esta semana", groups.week]
  ] as const;

  return (
    <div className="grid gap-6">
      <PageHeader title="Follow-ups" subtitle="Retornos pendentes por prioridade." />
      <div className="grid gap-4 lg:grid-cols-3">
        {sections.map(([title, leads]) => (
          <Card key={title} className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">{title}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{leads.length}</span>
            </div>
            <div className="grid gap-3">
              {leads.map((lead) => (
                <Link key={lead.id} href={`/leads/${lead.id}`} className="rounded-md border border-slate-200 p-3 hover:border-teal-300">
                  <div className="font-medium">{lead.companyName ?? lead.responsibleName}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <Badge className={statusColors[lead.status]}>{statusLabels[lead.status]}</Badge>
                    <Badge>{followUpStepLabel(lead.followUpCount + 1, lead.followUpSequenceLength)}</Badge>
                    {date(lead.nextFollowUpAt)}
                  </div>
                  {lead.nextAction || lead.nextStepNote ? <p className="mt-2 text-sm text-slate-600">{lead.nextAction ?? lead.nextStepNote}</p> : null}
                </Link>
              ))}
              {!leads.length ? <p className="text-sm text-slate-500">Nenhum lead nesta lista.</p> : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
