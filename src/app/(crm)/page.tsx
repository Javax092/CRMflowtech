import { endOfDay, startOfDay } from "date-fns";
import { Button, Card, PageHeader } from "@/components/ui";
import { getLeadDemoStatus } from "@/lib/demo-status";
import { currency } from "@/lib/format";
import { statusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const [total, byStatus, followUpsToday, potential, won, demoStatus] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({ by: ["status"], _count: true }),
    prisma.lead.count({ where: { nextFollowUpAt: { gte: todayStart, lte: todayEnd }, status: { notIn: ["WON", "LOST"] } } }),
    prisma.deal.aggregate({ _sum: { value: true } }),
    prisma.deal.aggregate({ _sum: { value: true }, where: { won: true } }),
    getLeadDemoStatus(prisma)
  ]);

  const count = (status: string) => byStatus.find((item) => item.status === status)?._count ?? 0;
  const closed = count("WON");
  const conversion = total ? Math.round((closed / total) * 100) : 0;
  const cards = [
    ["Total de leads", demoStatus.totalLeads],
    ["Total NOVO_LEAD", demoStatus.novoLead],
    ["Total ABORDADO", demoStatus.abordado],
    ["Total com demo criada", demoStatus.comDemo],
    ["Total sem demo", demoStatus.semDemo],
    ["Total ABORDADO sem demo", demoStatus.abordadoSemDemo],
    ["Total NOVO_LEAD com demo", demoStatus.novoLeadComDemo],
    ["Total NOVO_LEAD sem demo", demoStatus.novoLeadSemDemo],
    ["Leads interessados", count("INTERESTED")],
    ["Em negociação", count("PROPOSAL_SENT") + count("MEETING_SCHEDULED")],
    ["Clientes fechados", closed],
    ["Leads perdidos", count("LOST")],
    ["Follow-ups hoje", followUpsToday],
    ["Taxa de conversão", `${conversion}%`]
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral do funil comercial da FlowtechAM."
        action={<Button href="/admin/demos" variant="secondary">Monitorar demos</Button>}
      />
      <Card className="border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
        Faltam {demoStatus.semDemo} demos para concluir todos os leads.
      </Card>
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
