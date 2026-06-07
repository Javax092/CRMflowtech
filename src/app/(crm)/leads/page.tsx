import Link from "next/link";
import { deleteLeadAction } from "@/app/actions";
import { LeadQuickActions } from "@/components/lead-actions";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { currency, date } from "@/lib/format";
import { segmentLabels, serviceLabels, statusColors, statusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const leads = await prisma.lead.findMany({
    where: q
      ? {
          OR: [
            { companyName: { contains: q, mode: "insensitive" } },
            { responsibleName: { contains: q, mode: "insensitive" } },
            { whatsapp: { contains: q } },
            { instagram: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } }
          ]
        }
      : undefined,
    orderBy: [{ nextFollowUpAt: "asc" }, { createdAt: "desc" }]
  });

  return (
    <div className="grid gap-6">
      <PageHeader title="Leads" subtitle="Controle contatos, abordagens e status comerciais." action={<Button href="/leads/new">Novo lead</Button>} />
      <Card className="p-4">
        <form className="flex gap-2">
          <input className="focus-ring min-h-10 flex-1 rounded-md border border-slate-200 px-3 text-sm" name="q" placeholder="Buscar por empresa, responsável, contato..." defaultValue={q ?? ""} />
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                {["Nome", "Empresa", "Segmento", "WhatsApp", "Instagram", "Status", "Último", "Follow-up", "Serviço", "Valor", "Ações"].map((head) => (
                  <th key={head} className="px-4 py-3 font-semibold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => (
                <tr key={lead.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-3"><Link className="font-medium text-teal-700" href={`/leads/${lead.id}`}>{lead.responsibleName ?? "-"}</Link></td>
                  <td className="px-4 py-3">{lead.companyName ?? "-"}</td>
                  <td className="px-4 py-3">{segmentLabels[lead.segment]}</td>
                  <td className="px-4 py-3">{lead.whatsapp ?? "-"}</td>
                  <td className="px-4 py-3">{lead.instagram ? `@${lead.instagram}` : "-"}</td>
                  <td className="px-4 py-3"><Badge className={statusColors[lead.status]}>{statusLabels[lead.status]}</Badge></td>
                  <td className="px-4 py-3">{date(lead.lastContactAt)}</td>
                  <td className="px-4 py-3">{date(lead.nextFollowUpAt)}</td>
                  <td className="px-4 py-3">{serviceLabels[lead.offeredService]}</td>
                  <td className="px-4 py-3">{currency(lead.proposedValue?.toString())}</td>
                  <td className="px-4 py-3">
                    <div className="grid gap-2">
                      <div className="flex flex-wrap gap-2">
                        <Button href={`/leads/${lead.id}`} variant="secondary">Ver</Button>
                        <Button href={`/leads/${lead.id}/edit`} variant="secondary">Editar</Button>
                        <form action={deleteLeadAction.bind(null, lead.id)}>
                          <Button type="submit" variant="danger">Excluir</Button>
                        </form>
                      </div>
                      <LeadQuickActions id={lead.id} whatsapp={lead.whatsapp} instagram={lead.instagram} responsibleName={lead.responsibleName} companyName={lead.companyName} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
