import { startOfMonth } from "date-fns";
import { Card, PageHeader } from "@/components/ui";
import { currency } from "@/lib/format";
import { segmentLabels, sourceLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const monthStart = startOfMonth(new Date());
  const [createdMonth, contacted, responded, closed, potential, won, segments, sources] = await Promise.all([
    prisma.lead.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.lead.count({ where: { status: { in: ["CONTACTED", "RESPONDED", "INTERESTED", "MEETING_SCHEDULED", "PROPOSAL_SENT", "WON", "LOST"] } } }),
    prisma.lead.count({ where: { status: { in: ["RESPONDED", "INTERESTED", "MEETING_SCHEDULED", "PROPOSAL_SENT", "WON", "LOST"] } } }),
    prisma.lead.count({ where: { status: "WON" } }),
    prisma.deal.aggregate({ _sum: { value: true } }),
    prisma.deal.aggregate({ _sum: { value: true }, where: { won: true } }),
    prisma.lead.groupBy({ by: ["segment"], _count: true, where: { status: "WON" } }),
    prisma.lead.groupBy({ by: ["source"], _count: true, where: { status: "WON" } })
  ]);

  const metrics = [
    ["Leads cadastrados no mês", createdMonth],
    ["Leads abordados", contacted],
    ["Leads que responderam", responded],
    ["Clientes fechados", closed],
    ["Receita potencial", currency(potential._sum.value?.toString())],
    ["Receita fechada", currency(won._sum.value?.toString())]
  ];

  return (
    <div className="grid gap-6">
      <PageHeader title="Relatórios" subtitle="Indicadores simples para acompanhar tração comercial." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <strong className="mt-2 block text-2xl text-slate-950">{value}</strong>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Segmentos que mais convertem</h2>
          <div className="grid gap-2">
            {segments.map((item) => (
              <div key={item.segment} className="flex justify-between text-sm">
                <span>{segmentLabels[item.segment]}</span>
                <strong>{item._count}</strong>
              </div>
            ))}
            {!segments.length ? <p className="text-sm text-slate-500">Sem fechamentos ainda.</p> : null}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Origem dos melhores leads</h2>
          <div className="grid gap-2">
            {sources.map((item) => (
              <div key={item.source} className="flex justify-between text-sm">
                <span>{sourceLabels[item.source]}</span>
                <strong>{item._count}</strong>
              </div>
            ))}
            {!sources.length ? <p className="text-sm text-slate-500">Sem fechamentos ainda.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
