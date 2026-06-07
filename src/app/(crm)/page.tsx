import { endOfDay, startOfDay } from "date-fns";
import { Card, PageHeader } from "@/components/ui";
import { currency } from "@/lib/format";
import { statusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const [total, byStatus, followUpsToday, potential, won] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({ by: ["status"], _count: true }),
    prisma.lead.count({ where: { nextFollowUpAt: { gte: todayStart, lte: todayEnd }, status: { notIn: ["WON", "LOST"] } } }),
    prisma.deal.aggregate({ _sum: { value: true } }),
    prisma.deal.aggregate({ _sum: { value: true }, where: { won: true } })
  ]);

  const count = (status: string) => byStatus.find((item) => item.status === status)?._count ?? 0;
  const closed = count("WON");
  const conversion = total ? Math.round((closed / total) * 100) : 0;
  const cards = [
    ["Total de leads", total],
    ["Leads novos", count("NEW")],
    ["Leads abordados", count("CONTACTED")],
    ["Leads interessados", count("INTERESTED")],
    ["Em negociação", count("PROPOSAL_SENT") + count("MEETING_SCHEDULED")],
    ["Clientes fechados", closed],
    ["Leads perdidos", count("LOST")],
    ["Follow-ups hoje", followUpsToday],
    ["Taxa de conversão", `${conversion}%`]
  ];

  return (
    <div className="grid gap-6">
      <PageHeader title="Dashboard" subtitle="Visão geral do funil comercial da FlowtechAM." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <strong className="mt-2 block text-3xl text-slate-950">{value}</strong>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold text-slate-950">Receita</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Potencial</p>
              <p className="text-2xl font-semibold">{currency(potential._sum.value?.toString())}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Fechada</p>
              <p className="text-2xl font-semibold text-teal-700">{currency(won._sum.value?.toString())}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-slate-950">Distribuição do funil</h2>
          <div className="mt-4 grid gap-2">
            {byStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between text-sm">
                <span>{statusLabels[item.status]}</span>
                <strong>{item._count}</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
