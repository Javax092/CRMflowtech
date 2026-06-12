import { endOfDay, endOfWeek, startOfDay } from "date-fns";
import { ContactEventType, LeadStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui";
import { followUpStepLabel } from "@/lib/follow-up-sequence";
import { date, dateTime } from "@/lib/format";
import { eventLabels, statusColors, statusLabels } from "@/lib/labels";
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

async function recentFollowUpHistory() {
  return prisma.contactHistory.findMany({
    where: {
      type: {
        in: [
          ContactEventType.FOLLOW_UP,
          ContactEventType.FOLLOW_UP_SENT_AUTOMATION,
          ContactEventType.FOLLOW_UP_SEND_FAILED,
          ContactEventType.FOLLOW_UP_SEQUENCE_COMPLETED
        ]
      }
    },
    include: {
      lead: {
        select: {
          id: true,
          companyName: true,
          responsibleName: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 15
  });
}

function historySourceLabel(history: Awaited<ReturnType<typeof recentFollowUpHistory>>[number]) {
  if (history.type === ContactEventType.FOLLOW_UP) return "manual";
  return history.source ? `automático via ${history.source}` : "automático";
}

export default async function FollowUpsPage() {
  const [groups, recentHistory] = await Promise.all([groupFollowUps(), recentFollowUpHistory()]);
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
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Últimos envios de follow-up</h2>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{recentHistory.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Lead</th>
                <th className="px-3 py-2">Origem</th>
                <th className="px-3 py-2">Evento</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Message ID</th>
                <th className="px-3 py-2">Data/hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentHistory.map((history) => (
                <tr key={history.id}>
                  <td className="px-3 py-2">
                    <Link href={`/leads/${history.leadId}`} className="font-medium text-slate-900 hover:text-teal-700">
                      {history.lead.companyName ?? history.lead.responsibleName ?? "Lead sem nome"}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{historySourceLabel(history)}</td>
                  <td className="px-3 py-2 text-slate-600">{eventLabels[history.type]}</td>
                  <td className="px-3 py-2 text-slate-600">{history.provider ?? "-"}</td>
                  <td className="max-w-44 truncate px-3 py-2 text-slate-600">{history.messageId ?? "-"}</td>
                  <td className="px-3 py-2 text-slate-600">{dateTime(history.sentAt ?? history.createdAt)}</td>
                </tr>
              ))}
              {!recentHistory.length ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={6}>Nenhum envio registrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
