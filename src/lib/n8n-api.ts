import { ContactEventType, LeadSource, LeadStatus, OfferedService, PipelineStage, Segment } from "@prisma/client";
import { z } from "zod";

const emptyToNull = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value ?? null;
}, z.string().nullable().optional());

export const n8nLeadCreateSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do lead."),
  segment: z.string().trim().min(1, "Informe o segmento do lead."),
  instagram: emptyToNull,
  city: emptyToNull,
  whatsapp: emptyToNull,
  email: emptyToNull,
  notes: emptyToNull,
  status: z.string().trim().optional()
});

export const n8nLeadUpdateSchema = z
  .object({
    status: z.string().trim().optional(),
    recommendedProduct: emptyToNull,
    demoUrl: emptyToNull,
    audit: emptyToNull,
    approachScript: emptyToNull,
    nextAction: emptyToNull
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Informe ao menos um campo para atualizar."
  });

export function segmentFromApi(value: string): Segment {
  const normalized = normalizeText(value);
  const map: Record<string, Segment> = {
    advocacia: Segment.LAW,
    advogado: Segment.LAW,
    law: Segment.LAW,
    nutricao: Segment.NUTRITION,
    nutricionista: Segment.NUTRITION,
    nutrition: Segment.NUTRITION,
    veterinaria: Segment.VETERINARY,
    veterinario: Segment.VETERINARY,
    veterinary: Segment.VETERINARY,
    petshop: Segment.PETSHOP,
    pet: Segment.PETSHOP,
    clinica: Segment.CLINIC,
    clinic: Segment.CLINIC,
    restaurante: Segment.RESTAURANT,
    restaurant: Segment.RESTAURANT,
    outro: Segment.OTHER,
    other: Segment.OTHER
  };

  return map[normalized] ?? Segment.OTHER;
}

export function leadStatusFromApi(value?: string): LeadStatus {
  if (!value) return LeadStatus.NEW;

  const normalized = normalizeText(value);
  const map: Record<string, LeadStatus> = {
    novo_lead: LeadStatus.NEW,
    new: LeadStatus.NEW,
    demo_recomendada: LeadStatus.DEMO_CREATED,
    demo_created: LeadStatus.DEMO_CREATED,
    abordado: LeadStatus.CONTACTED,
    contacted: LeadStatus.CONTACTED,
    respondeu: LeadStatus.RESPONDED,
    responded: LeadStatus.RESPONDED,
    interessado: LeadStatus.INTERESTED,
    interested: LeadStatus.INTERESTED,
    reuniao_marcada: LeadStatus.MEETING_SCHEDULED,
    meeting_scheduled: LeadStatus.MEETING_SCHEDULED,
    proposta_enviada: LeadStatus.PROPOSAL_SENT,
    proposal_sent: LeadStatus.PROPOSAL_SENT,
    fechado: LeadStatus.WON,
    won: LeadStatus.WON,
    perdido: LeadStatus.LOST,
    lost: LeadStatus.LOST
  };

  const status = map[normalized];
  if (!status) throw new Error(`Status inválido: ${value}`);
  return status;
}

export function pipelineStageFromStatus(status: LeadStatus): PipelineStage {
  const map: Record<LeadStatus, PipelineStage> = {
    NEW: PipelineStage.LEAD_ENCONTRADO,
    DEMO_CREATED: PipelineStage.DEMO_CRIADA,
    CONTACTED: PipelineStage.MENSAGEM_ENVIADA,
    RESPONDED: PipelineStage.RESPONDEU,
    INTERESTED: PipelineStage.NEGOCIACAO,
    MEETING_SCHEDULED: PipelineStage.REUNIAO_MARCADA,
    PROPOSAL_SENT: PipelineStage.PROPOSTA_ENVIADA,
    WON: PipelineStage.FECHADO,
    LOST: PipelineStage.PERDIDO
  };

  return map[status];
}

export function leadSourceFromApi(data: { instagram?: string | null; whatsapp?: string | null }) {
  if (data.instagram) return LeadSource.INSTAGRAM;
  if (data.whatsapp) return LeadSource.WHATSAPP;
  return LeadSource.MANUAL_LIST;
}

export function statusToApi(status: LeadStatus) {
  const map: Record<LeadStatus, string> = {
    NEW: "NOVO_LEAD",
    DEMO_CREATED: "DEMO_RECOMENDADA",
    CONTACTED: "ABORDADO",
    RESPONDED: "RESPONDEU",
    INTERESTED: "INTERESSADO",
    MEETING_SCHEDULED: "REUNIAO_MARCADA",
    PROPOSAL_SENT: "PROPOSTA_ENVIADA",
    WON: "FECHADO",
    LOST: "PERDIDO"
  };

  return map[status];
}

export function formatLeadForApi<T extends { status: LeadStatus; createdAt: Date; updatedAt: Date; proposedValue?: unknown }>(lead: T) {
  return {
    ...lead,
    status: statusToApi(lead.status),
    proposedValue: lead.proposedValue?.toString?.() ?? null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString()
  };
}

export function historyForN8nUpdate(data: { audit?: string | null; approachScript?: string | null; recommendedProduct?: string | null }) {
  if (!data.audit && !data.approachScript && !data.recommendedProduct) return undefined;

  return {
    create: {
      type: ContactEventType.MESSAGE_GENERATED,
      title: "Auditoria do n8n registrada",
      message: [data.recommendedProduct ? `Produto recomendado: ${data.recommendedProduct}` : null, data.audit, data.approachScript]
        .filter(Boolean)
        .join("\n\n")
    }
  };
}

export const defaultOfferedService = OfferedService.WEBSITE;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}
