import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { deleteLeadAction } from "@/app/actions";
import { DailyLeadActions } from "@/components/daily-lead-actions";
import { HistoryForm } from "@/components/history-form";
import { LeadApproachPanel } from "@/components/lead-approach-panel";
import { LeadDemoLinkForm } from "@/components/lead-demo-link-form";
import { LeadQuickActions } from "@/components/lead-actions";
import { ScriptMessage } from "@/components/script-message";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { generateLeadApproach, recommendedProductForLead } from "@/lib/approach";
import { followUpStepLabel } from "@/lib/follow-up-sequence";
import { currency, date } from "@/lib/format";
import { eventLabels, followUpSequenceStatusLabels, pipelineStageLabels, segmentLabels, serviceLabels, sourceLabels, statusColors, statusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lead, scripts, demos] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        histories: { orderBy: { createdAt: "desc" } },
        followUps: { orderBy: { dueAt: "asc" } },
        deals: { orderBy: { createdAt: "desc" } },
        demoSite: true
      }
    }),
    prisma.scriptTemplate.findMany({ where: { active: true }, orderBy: { type: "asc" } }),
    prisma.demoSite.findMany({ where: { status: "ACTIVE" }, orderBy: [{ segment: "asc" }, { name: "asc" }] })
  ]);
  if (!lead) notFound();

  const recommendedProduct = recommendedProductForLead(lead);
  const approachScript = lead.approachScript || generateLeadApproach({ ...lead, recommendedProduct });

  const fields = [
    ["Responsável", lead.responsibleName],
    ["Empresa", lead.companyName],
    ["Segmento", segmentLabels[lead.segment]],
    ["Instagram", lead.instagram ? `@${lead.instagram}` : null],
    ["WhatsApp", lead.whatsapp],
    ["E-mail", lead.email],
    ["Cidade", lead.city],
    ["Site atual", lead.websiteUrl],
    ["Demonstração", lead.demoUrl],
    ["Demo vinculada", lead.demoSite?.name],
    ["Serviço", serviceLabels[lead.offeredService]],
    ["Valor proposto", currency(lead.proposedValue?.toString())],
    ["Pipeline", pipelineStageLabels[lead.pipelineStage]],
    ["Origem", sourceLabels[lead.source]],
    ["Primeira mensagem enviada", date(lead.firstMessageSentAt)],
    ["Primeiro contato", date(lead.firstContactAt)],
    ["Último contato", date(lead.lastContactAt)],
    ["Último follow-up", date(lead.lastFollowUpAt)],
    ["Próximo follow-up", date(lead.nextFollowUpAt)],
    ["Sequência", followUpStepLabel(lead.followUpCount + 1, lead.followUpSequenceLength)],
    ["Status da sequência", followUpSequenceStatusLabels[lead.followUpSequenceStatus]]
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        title={lead.companyName ?? lead.responsibleName ?? "Lead"}
        subtitle="Detalhes comerciais, histórico, propostas e próxima ação."
        action={
          <div className="flex flex-wrap gap-2">
            <Button href="#abordagem" variant="secondary">Gerar abordagem</Button>
            <Button href={`/leads/${lead.id}/edit`} variant="secondary">Editar</Button>
            <form action={deleteLeadAction.bind(null, lead.id)}>
              <Button type="submit" variant="danger">Excluir</Button>
            </form>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <div className="grid gap-6">
          <Card id="abordagem" className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <Badge className={statusColors[lead.status]}>{statusLabels[lead.status]}</Badge>
              <div className="flex flex-wrap gap-2">
                {lead.demoUrl ? (
                  <Button href={lead.demoUrl} variant="secondary">
                    <ExternalLink size={16} />
                    Abrir Demo
                  </Button>
                ) : null}
                <LeadQuickActions id={lead.id} whatsapp={lead.whatsapp} instagram={lead.instagram} responsibleName={lead.responsibleName} companyName={lead.companyName} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs uppercase text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{value || "-"}</p>
                </div>
              ))}
            </div>
            {lead.notes ? <p className="mt-5 rounded-md bg-slate-50 p-3 text-sm text-slate-700">{lead.notes}</p> : null}
          </Card>
          <Card className="p-5">
            <div className="mb-4">
              <h2 className="font-semibold text-slate-950">Abordagem pronta</h2>
              <p className="mt-1 text-sm text-slate-500">Mensagem comercial gerada a partir do lead, auditoria, segmento e produto recomendado.</p>
            </div>
            <LeadApproachPanel
              leadId={lead.id}
              initialRecommendedProduct={recommendedProduct}
              initialAudit={lead.audit ?? ""}
              initialDemoUrl={lead.demoUrl ?? ""}
              initialApproachScript={approachScript}
            />
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-slate-950">Histórico de contatos</h2>
            <div className="grid gap-3">
              {lead.histories.map((item) => (
                <div key={item.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong className="text-sm">{eventLabels[item.type]} · {item.title}</strong>
                    <span className="text-xs text-slate-500">{date(item.createdAt)}</span>
                  </div>
                  {item.message ? <p className="mt-2 text-sm text-slate-600">{item.message}</p> : null}
                </div>
              ))}
              {!lead.histories.length ? <p className="text-sm text-slate-500">Nenhum evento registrado.</p> : null}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-slate-950">Adicionar evento</h2>
            <HistoryForm leadId={lead.id} />
          </Card>
        </div>
        <div className="grid content-start gap-6">
          <Card className="p-5">
            <h2 className="font-semibold text-slate-950">Próxima ação recomendada</h2>
            <p className="mt-3 text-sm text-slate-600">{lead.nextAction || lead.nextStepNote || "Defina um próximo follow-up com objetivo claro para evitar perda de timing."}</p>
            <p className="mt-2 text-sm font-medium text-teal-700">{date(lead.nextFollowUpAt)}</p>
            <div className="mt-4">
              <DailyLeadActions leadId={lead.id} />
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-slate-950">Mensagem personalizada</h2>
            <ScriptMessage
              leadId={lead.id}
              scripts={scripts.map(({ id, name, type, content }) => ({ id, name, type, content }))}
              lead={{
                responsibleName: lead.responsibleName,
                companyName: lead.companyName,
                segment: segmentLabels[lead.segment],
                demoUrl: lead.demoUrl,
                offeredService: serviceLabels[lead.offeredService]
              }}
            />
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-slate-950">Biblioteca de demos</h2>
            <LeadDemoLinkForm
              leadId={lead.id}
              currentDemoSiteId={lead.demoSiteId}
              demos={demos.map(({ id, name, url, segment }) => ({ id, name, url, segment }))}
            />
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-slate-950">Propostas e deals</h2>
            <div className="grid gap-2">
              {lead.deals.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between rounded-md bg-slate-50 p-3 text-sm">
                  <span>{deal.title}</span>
                  <strong>{currency(deal.value.toString())}</strong>
                </div>
              ))}
              {!lead.deals.length ? <p className="text-sm text-slate-500">Nenhuma proposta registrada.</p> : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
