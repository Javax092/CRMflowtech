import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { demoMissingWhere, getLeadDemoStatus, hasDemo, leadDemoSortRank } from "@/lib/demo-status";
import { date } from "@/lib/format";
import { statusColors, statusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

type DemoFilter =
  | "todos"
  | "com-demo"
  | "sem-demo"
  | "novo-lead-com-demo"
  | "novo-lead-sem-demo"
  | "abordado-com-demo"
  | "abordado-sem-demo";

const filters: Array<{ key: DemoFilter; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "com-demo", label: "Com Demo" },
  { key: "sem-demo", label: "Sem Demo" },
  { key: "novo-lead-com-demo", label: "NOVO_LEAD com Demo" },
  { key: "novo-lead-sem-demo", label: "NOVO_LEAD sem Demo" },
  { key: "abordado-com-demo", label: "ABORDADO com Demo" },
  { key: "abordado-sem-demo", label: "ABORDADO sem Demo" }
];

function filterLeads(leads: Awaited<ReturnType<typeof getLeads>>, filter: DemoFilter) {
  return leads.filter((lead) => {
    const demoCreated = hasDemo(lead);
    if (filter === "com-demo") return demoCreated;
    if (filter === "sem-demo") return !demoCreated;
    if (filter === "novo-lead-com-demo") return lead.status === "NEW" && demoCreated;
    if (filter === "novo-lead-sem-demo") return lead.status === "NEW" && !demoCreated;
    if (filter === "abordado-com-demo") return lead.status === "CONTACTED" && demoCreated;
    if (filter === "abordado-sem-demo") return lead.status === "CONTACTED" && !demoCreated;
    return true;
  });
}

async function getLeads() {
  const leads = await prisma.lead.findMany({
    select: {
      id: true,
      companyName: true,
      responsibleName: true,
      status: true,
      city: true,
      instagram: true,
      demoUrl: true,
      demoSlug: true,
      createdAt: true
    },
    orderBy: [{ createdAt: "desc" }]
  });

  return leads.sort((a, b) => {
    const rankDiff = leadDemoSortRank(a) - leadDemoSortRank(b);
    if (rankDiff !== 0) return rankDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export default async function AdminDemosPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const [{ filtro }, leads, status] = await Promise.all([
    searchParams,
    getLeads(),
    getLeadDemoStatus(prisma)
  ]);
  const activeFilter = filters.some((item) => item.key === filtro) ? filtro as DemoFilter : "todos";
  const filteredLeads = filterLeads(leads, activeFilter);
  const completion = status.totalLeads ? Math.round((status.comDemo / status.totalLeads) * 100) : 0;

  return (
    <div className="grid gap-6">
      <PageHeader title="Monitoramento de demos" subtitle="Acompanhe quais leads já possuem demo criada e quais ainda precisam." />

      <Card className="border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
        Faltam {status.semDemo} demos para concluir todos os leads.
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-slate-500">Demos criadas</p>
          <strong className="mt-2 block text-3xl text-slate-950">{status.comDemo}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">Demos pendentes</p>
          <strong className="mt-2 block text-3xl text-slate-950">{status.semDemo}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">Percentual concluído</p>
          <strong className="mt-2 block text-3xl text-slate-950">{completion}%</strong>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Button
              key={filter.key}
              href={filter.key === "todos" ? "/admin/demos" : `/admin/demos?filtro=${filter.key}`}
              variant={activeFilter === filter.key ? "primary" : "secondary"}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                {["Empresa", "Responsável", "Status", "Cidade", "Instagram", "Demo", "Demo URL", "Data criação", "Ações"].map((head) => (
                  <th key={head} className="px-4 py-3 font-semibold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map((lead) => {
                const demoCreated = Boolean(lead.demoUrl?.trim());

                return (
                  <tr key={lead.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link className="font-medium text-teal-700" href={`/leads/${lead.id}`}>
                        {lead.companyName ?? "-"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{lead.responsibleName ?? "-"}</td>
                    <td className="px-4 py-3"><Badge className={statusColors[lead.status]}>{statusLabels[lead.status]}</Badge></td>
                    <td className="px-4 py-3">{lead.city ?? "-"}</td>
                    <td className="px-4 py-3">{lead.instagram ? `@${lead.instagram}` : "-"}</td>
                    <td className="px-4 py-3">
                      <Badge className={demoCreated ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}>
                        {demoCreated ? "🟢 Demo Criada" : "🔴 Sem Demo"}
                      </Badge>
                    </td>
                    <td className="max-w-[280px] break-all px-4 py-3">{lead.demoUrl ?? "-"}</td>
                    <td className="px-4 py-3">{date(lead.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button href={`/leads/${lead.id}`} variant="secondary">Ver lead</Button>
                        {lead.demoUrl ? (
                          <Button href={lead.demoUrl} variant="secondary">
                            <ExternalLink size={16} />
                            Abrir Demo
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filteredLeads.length ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={9}>Nenhum lead encontrado para este filtro.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
