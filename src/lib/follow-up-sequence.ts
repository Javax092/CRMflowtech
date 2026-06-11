import { addDays } from "date-fns";
import { FollowUpSequenceStatus, LeadStatus, PipelineStage } from "@prisma/client";

export const followUpOffsets = [2, 5, 10] as const;
export const defaultFollowUpSequenceLength = 3;
export const followUpMessages = {
  1: "Olá! Tudo bem? Passando apenas para confirmar se você conseguiu visualizar a mensagem que enviei sobre algumas oportunidades que identifiquei para o seu negócio. Posso te mostrar rapidamente o que encontrei? 😊",
  2: "Olá! Continuei analisando a presença digital da empresa e encontrei alguns pontos interessantes que podem gerar mais clientes sem aumentar investimento em anúncios. Achei que valeria a pena compartilhar. Posso te mostrar?",
  3: "Olá! Imagino que a rotina esteja corrida. Vou encerrar este contato para não incomodar. Mas caso tenha interesse em conhecer as oportunidades que identifiquei para aumentar as vendas e fortalecer a presença digital da empresa, fico à disposição. Sucesso para vocês! 🚀"
} as const;

export const advancedPipelineStages = new Set<PipelineStage>([
  PipelineStage.RESPONDEU,
  PipelineStage.REUNIAO_MARCADA,
  PipelineStage.PROPOSTA_ENVIADA,
  PipelineStage.NEGOCIACAO,
  PipelineStage.FECHADO,
  PipelineStage.PERDIDO
]);

export function statusFromPipelineStage(stage: PipelineStage): LeadStatus {
  const map: Record<PipelineStage, LeadStatus> = {
    LEAD_ENCONTRADO: LeadStatus.NEW,
    DEMO_CRIADA: LeadStatus.DEMO_CREATED,
    MENSAGEM_ENVIADA: LeadStatus.CONTACTED,
    RESPONDEU: LeadStatus.RESPONDED,
    REUNIAO_MARCADA: LeadStatus.MEETING_SCHEDULED,
    PROPOSTA_ENVIADA: LeadStatus.PROPOSAL_SENT,
    NEGOCIACAO: LeadStatus.INTERESTED,
    FECHADO: LeadStatus.WON,
    PERDIDO: LeadStatus.LOST
  };

  return map[stage];
}

export function normalizeSequenceLength(value?: number | null) {
  return value === 2 ? 2 : defaultFollowUpSequenceLength;
}

export function followUpStepLabel(step: number, sequenceLength: number) {
  return `${Math.min(Math.max(step, 1), sequenceLength)}/${sequenceLength}`;
}

export function nextFollowUpDate(firstMessageSentAt: Date, nextStep: number) {
  const offset = followUpOffsets[nextStep - 1];
  return offset ? addDays(firstMessageSentAt, offset) : null;
}

export function nextFollowUpAction(nextStep: number) {
  return `Enviar follow-up ${nextStep}`;
}

export function isAdvancedPipelineStage(stage: PipelineStage) {
  return advancedPipelineStages.has(stage);
}

export function messageSentSequenceUpdate(input: {
  now: Date;
  firstMessageSentAt?: Date | null;
  firstContactAt?: Date | null;
  sequenceLength?: number | null;
}) {
  const firstMessageSentAt = input.firstMessageSentAt ?? input.now;
  const firstContactAt = input.firstContactAt ?? firstMessageSentAt;
  const sequenceLength = normalizeSequenceLength(input.sequenceLength);
  const nextStep = 1;

  return {
    firstMessageSentAt,
    firstContactAt,
    lastContactAt: input.now,
    followUpCount: 0,
    followUpSequenceLength: sequenceLength,
    followUpSequenceStatus: FollowUpSequenceStatus.ACTIVE,
    nextFollowUpAt: nextFollowUpDate(firstMessageSentAt, nextStep),
    nextAction: nextFollowUpAction(nextStep),
    followUpType: `Follow-up ${nextStep}`,
    nextStepNote: nextFollowUpAction(nextStep)
  };
}

export function followUpSentSequenceUpdate(input: {
  now: Date;
  firstMessageSentAt: Date;
  followUpCount: number;
  sequenceLength?: number | null;
}) {
  const sequenceLength = normalizeSequenceLength(input.sequenceLength);
  const followUpCount = Math.min(input.followUpCount + 1, sequenceLength);
  const completed = followUpCount >= sequenceLength;
  const nextStep = followUpCount + 1;
  const nextFollowUpAt = completed ? null : nextFollowUpDate(input.firstMessageSentAt, nextStep);
  const nextAction = completed ? null : nextFollowUpAction(nextStep);

  return {
    followUpCount,
    followUpSequenceLength: sequenceLength,
    followUpSequenceStatus: completed ? FollowUpSequenceStatus.COMPLETED : FollowUpSequenceStatus.ACTIVE,
    lastFollowUpAt: input.now,
    lastContactAt: input.now,
    nextFollowUpAt,
    nextAction,
    followUpType: completed ? null : `Follow-up ${nextStep}`,
    nextStepNote: nextAction
  };
}

export function canceledSequenceUpdate(nextAction: string | null = null) {
  return {
    followUpSequenceStatus: FollowUpSequenceStatus.CANCELED,
    nextFollowUpAt: null,
    nextAction,
    nextStepNote: nextAction
  };
}

export function pausedSequenceUpdate() {
  return {
    followUpSequenceStatus: FollowUpSequenceStatus.PAUSED,
    nextAction: "Sequência pausada",
    nextStepNote: "Sequência pausada"
  };
}
