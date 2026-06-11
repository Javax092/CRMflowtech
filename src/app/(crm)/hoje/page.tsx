import { endOfDay, startOfDay } from "date-fns";
import { LeadStatus, PipelineStage, Prisma } from "@prisma/client";
import { AlertTriangle, CheckSquare, CircleDollarSign, Clock3, ListTodo, Send, UserPlus } from "lucide-react";
import type { ComponentType } from "react";
import { DailyLeadActions } from "@/components/daily-lead-actions";
import { Badge, Card, PageHeader } from "@/components/ui";
import { backfillMessageSentFollowUps } from "@/lib/follow-up-backfill";
import { followUpStepLabel } from "@/lib/follow-up-sequence";
import { currency, date } from "@/lib/format";
import { pipelineStageLabels, segmentLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

const activeLeadWhere: Prisma.LeadWhereInput = {
  status: { notIn: [LeadStatus.WON, LeadStatus.LOST] },
  pipelineStage: { notIn: [PipelineStage.FECHADO, PipelineStage.PERDIDO] }
};

const dailyLeadSelect = {
  id: true,
  responsibleName: true,
  companyName: true,
  segment: true,
  whatsapp: true,
  instagram: true,
  pipelineStage: true,
  firstMessageSentAt: true,
  firstContactAt: true,
  nextFollowUpAt: true,
  followUpCount: true,
  followUpSequenceLength: true,
  followUpSequenceStatus: true,
  proposedValue: true,
  nextAction: true,
  nextStepNote: true
} satisfies Prisma.LeadSelect;

type DailyLead = Prisma.LeadGetPayload<{ select: typeof dailyLeadSelect }>;

function leadName(lead: DailyLead) {
  return lead.companyName ?? lead.responsibleName ?? "Lead sem nome";
}

function contactLine(lead: DailyLead) {
  const contacts = [];
  if (lead.whatsapp) contacts.push(`WhatsApp: ${lead.whatsapp}`);
  if (lead.instagram) contacts.push(`Instagram: @${lead.instagram}`);
  return contacts.length ? contacts.join(" · ") : "Sem canal cadastrado";
}

function moneyTotal(leads: DailyLead[]) {
  return leads.reduce((total, lead) => total + Number(lead.proposedValue ?? 0), 0);
}

async function getDailyWork() {
  await backfillMessageSentFollowUps(prisma);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [overdueFollowUps, todayFollowUps, withoutNextStep, newLeads, openProposals, demosWithoutMessage] = await Promise.all([
    prisma.lead.findMany({
      where: { ...activeLeadWhere, nextFollowUpAt: { lt: todayStart } },
      select: dailyLeadSelect,
      orderBy: { nextFollowUpAt: "asc" }
    }),
    prisma.lead.findMany({
      where: { ...activeLeadWhere, nextFollowUpAt: { gte: todayStart, lte: todayEnd } },
      select: dailyLeadSelect,
      orderBy: { nextFollowUpAt: "asc" }
    }),
    prisma.lead.findMany({
      where: { ...activeLeadWhere, pipelineStage: PipelineStage.MENSAGEM_ENVIADA, nextFollowUpAt: null },
      select: dailyLeadSelect,
      orderBy: { updatedAt: "asc" }
    }),
    prisma.lead.findMany({
      where: { ...activeLeadWhere, pipelineStage: PipelineStage.LEAD_ENCONTRADO },
      select: dailyLeadSelect,
      orderBy: { createdAt: "desc" }
    }),
    prisma.lead.findMany({
      where: { ...activeLeadWhere, pipelineStage: { in: [PipelineStage.PROPOSTA_ENVIADA, PipelineStage.NEGOCIACAO] } },
      select: dailyLeadSelect,
      orderBy: [{ proposedValue: "desc" }, { updatedAt: "desc" }]
    }),
    prisma.lead.findMany({
      where: { ...activeLeadWhere, pipelineStage: PipelineStage.DEMO_CRIADA },
      select: dailyLeadSelect,
      orderBy: { updatedAt: "asc" }
    })
  ]);

  const overdueByStep = {
    step1: overdueFollowUps.filter((lead) => lead.followUpCount === 0),
    step2: overdueFollowUps.filter((lead) => lead.followUpCount === 1),
    step3: overdueFollowUps.filter((lead) => lead.followUpCount >= 2)
  };

  return { overdueFollowUps, overdueByStep, todayFollowUps, withoutNextStep, newLeads, openProposals, demosWithoutMessage };
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  tone = "default"
}: {
  title: string;
  value: string | number;
  icon: ComponentType<{ size?: number; className?: string }>;
  tone?: "default" | "urgent" | "money";
}) {
  return (
    <Card className={`p-4 ${tone === "urgent" ? "border-rose-200 bg-rose-50" : tone === "money" ? "border-emerald-200 bg-emerald-50" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <Icon className={tone === "urgent" ? "text-rose-600" : tone === "money" ? "text-emerald-700" : "text-teal-700"} size={24} />
      </div>
    </Card>
  );
}

function LeadCard({ lead, urgent = false }: { lead: DailyLead; urgent?: boolean }) {
  return (
    <Card className={`p-4 ${urgent ? "border-rose-300 bg-rose-50/70" : ""}`}>
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-950">{leadName(lead)}</h3>
              {urgent ? <Badge className="bg-rose-600 text-white">Urgente</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-slate-600">{segmentLabels[lead.segment]}</p>
            <p className="mt-1 text-sm text-slate-600">{contactLine(lead)}</p>
          </div>
          <div className="grid gap-2 text-sm lg:min-w-56">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Pipeline</span>
              <strong className="text-right text-slate-900">{pipelineStageLabels[lead.pipelineStage]}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Primeiro contato</span>
              <strong className="text-slate-900">{date(lead.firstMessageSentAt ?? lead.firstContactAt)}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Follow-up</span>
              <strong className={urgent ? "text-rose-700" : "text-slate-900"}>{date(lead.nextFollowUpAt)}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Sequência</span>
              <strong className="text-slate-900">{followUpStepLabel(lead.followUpCount + 1, lead.followUpSequenceLength)}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Valor</span>
              <strong className="text-slate-900">{currency(lead.proposedValue?.toString())}</strong>
            </div>
          </div>
        </div>
        {lead.nextAction || lead.nextStepNote ? <p className="rounded-md bg-white/70 p-3 text-sm text-slate-700">{lead.nextAction ?? lead.nextStepNote}</p> : null}
        <DailyLeadActions leadId={lead.id} />
      </div>
    </Card>
  );
}

function WorkSection({
  title,
  subtitle,
  leads,
  urgent = false
}: {
  title: string;
  subtitle: string;
  leads: DailyLead[];
  urgent?: boolean;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{leads.length}</span>
      </div>
      <div className="grid gap-3">
        {leads.map((lead) => <LeadCard key={lead.id} lead={lead} urgent={urgent} />)}
        {!leads.length ? <p className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500">Nada pendente nesta lista.</p> : null}
      </div>
    </section>
  );
}

function DailyRoutine() {
  const items = [
    "Ver leads atrasados",
    "Abordar novos leads",
    "Enviar follow-ups",
    "Atualizar status dos interessados",
    "Registrar próximos passos"
  ];

  return (
    <section className="grid gap-3">
      <div className="flex items-center gap-2">
        <CheckSquare className="text-teal-700" size={20} />
        <h2 className="text-lg font-semibold text-slate-950">Rotina de hoje</h2>
      </div>
      <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <label key={item} className="flex min-h-12 items-center gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-teal-700" />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

export default async function TodayPage() {
  const groups = await getDailyWork();
  const negotiationValue = moneyTotal(groups.openProposals);

  return (
    <div className="grid gap-6">
      <PageHeader title="Hoje" subtitle="Central diária de execução comercial: priorize contatos, follow-ups e propostas abertas." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard title="Atrasados" value={groups.overdueFollowUps.length} icon={AlertTriangle} tone="urgent" />
        <SummaryCard title="Para hoje" value={groups.todayFollowUps.length} icon={Clock3} />
        <SummaryCard title="Sem próximo passo" value={groups.withoutNextStep.length} icon={ListTodo} />
        <SummaryCard title="Novos" value={groups.newLeads.length} icon={UserPlus} />
        <SummaryCard title="Propostas abertas" value={groups.openProposals.length} icon={Send} />
        <SummaryCard title="Valor em negociação" value={currency(negotiationValue)} icon={CircleDollarSign} tone="money" />
      </div>

      <DailyRoutine />

      <div className="grid gap-8">
        <WorkSection
          title="Follow-up 1 atrasado"
          subtitle="Primeiro retorno vencido antes de hoje."
          leads={groups.overdueByStep.step1}
          urgent
        />
        <WorkSection
          title="Follow-up 2 atrasado"
          subtitle="Segundo retorno vencido antes de hoje."
          leads={groups.overdueByStep.step2}
          urgent
        />
        <WorkSection
          title="Follow-up 3 atrasado"
          subtitle="Último retorno vencido antes de hoje."
          leads={groups.overdueByStep.step3}
          urgent
        />
        <WorkSection title="Follow-ups de hoje" subtitle="Retornos que precisam acontecer ainda hoje." leads={groups.todayFollowUps} />
        <WorkSection title="Leads em Mensagem enviada sem próximo passo" subtitle="Leads abordados sem próximo follow-up definido." leads={groups.withoutNextStep} />
        <WorkSection title="Leads novos ainda não abordados" subtitle="Pipeline em Lead encontrado." leads={groups.newLeads} />
        <WorkSection title="Propostas abertas" subtitle="Pipeline em Proposta enviada ou Negociação." leads={groups.openProposals} />
        <WorkSection title="Demos criadas sem mensagem enviada" subtitle="Pipeline em Demo criada aguardando abordagem." leads={groups.demosWithoutMessage} />
      </div>
    </div>
  );
}
