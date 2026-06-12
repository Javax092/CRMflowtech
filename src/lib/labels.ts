import {
  ContactEventType,
  FollowUpSequenceStatus,
  LeadSource,
  LeadStatus,
  OfferedService,
  PipelineStage,
  ScriptType,
  Segment
} from "@prisma/client";

export const statusLabels: Record<LeadStatus, string> = {
  NEW: "Novo",
  DEMO_CREATED: "Site demo criado",
  CONTACTED: "Abordado",
  RESPONDED: "Respondeu",
  INTERESTED: "Interessado",
  MEETING_SCHEDULED: "Reunião marcada",
  PROPOSAL_SENT: "Proposta enviada",
  WON: "Fechado",
  LOST: "Perdido"
};

export const segmentLabels: Record<Segment, string> = {
  LAW: "Advocacia",
  NUTRITION: "Nutrição",
  VETERINARY: "Veterinária",
  PETSHOP: "Petshop",
  CLINIC: "Clínica",
  RESTAURANT: "Restaurante",
  OTHER: "Outro"
};

export const demoSegments = [
  "Advocacia",
  "Nutrição",
  "Veterinária",
  "Petshop",
  "Clínica",
  "Restaurante",
  "Serviços locais",
  "Outro"
];

export const serviceLabels: Record<OfferedService, string> = {
  WEBSITE: "Site",
  SYSTEM: "Sistema",
  AUTOMATION: "Automação",
  SEO: "SEO",
  MONTHLY_MAINTENANCE: "Manutenção mensal"
};

export const sourceLabels: Record<LeadSource, string> = {
  INSTAGRAM: "Instagram",
  GOOGLE_MAPS: "Google Maps",
  REFERRAL: "Indicação",
  WHATSAPP: "WhatsApp",
  MANUAL_LIST: "Lista manual"
};

export const eventLabels: Record<ContactEventType, string> = {
  FIRST_CONTACT: "Primeiro contato",
  FOLLOW_UP: "Follow-up",
  FOLLOW_UP_AUTOMATION_QUEUED: "Follow-up enfileirado",
  FOLLOW_UP_SENT_AUTOMATION: "Follow-up automático enviado",
  FOLLOW_UP_SEND_FAILED: "Falha no follow-up automático",
  FOLLOW_UP_SEQUENCE_COMPLETED: "Sequência de follow-up concluída",
  MEETING_SCHEDULED: "Reunião marcada",
  PROPOSAL_SENT: "Proposta enviada",
  CLIENT_REPLIED: "Cliente respondeu",
  CLIENT_WON: "Cliente fechou",
  CLIENT_DECLINED: "Cliente recusou",
  MESSAGE_GENERATED: "Mensagem gerada",
  PIPELINE_CHANGED: "Pipeline alterado",
  DEMO_LINKED: "Demo vinculada"
};

export const scriptLabels: Record<ScriptType, string> = {
  FIRST_APPROACH: "Primeira abordagem",
  FOLLOW_UP_1: "Follow-up 1",
  FOLLOW_UP_2: "Follow-up 2",
  FOLLOW_UP_3: "Follow-up 3",
  WEBSITE_PROPOSAL: "Proposta de site",
  SYSTEM_PROPOSAL: "Proposta de sistema",
  MONTHLY_PROPOSAL: "Proposta de mensalidade"
};

export const statusColors: Record<LeadStatus, string> = {
  NEW: "bg-slate-100 text-slate-700",
  DEMO_CREATED: "bg-cyan-100 text-cyan-800",
  CONTACTED: "bg-blue-100 text-blue-800",
  RESPONDED: "bg-indigo-100 text-indigo-800",
  INTERESTED: "bg-emerald-100 text-emerald-800",
  MEETING_SCHEDULED: "bg-violet-100 text-violet-800",
  PROPOSAL_SENT: "bg-amber-100 text-amber-800",
  WON: "bg-green-100 text-green-800",
  LOST: "bg-rose-100 text-rose-800"
};

export const pipelineStageLabels: Record<PipelineStage, string> = {
  LEAD_ENCONTRADO: "Lead encontrado",
  DEMO_CRIADA: "Demo criada",
  MENSAGEM_ENVIADA: "Mensagem enviada",
  RESPONDEU: "Respondeu",
  REUNIAO_MARCADA: "Reunião marcada",
  PROPOSTA_ENVIADA: "Proposta enviada",
  NEGOCIACAO: "Negociação",
  FECHADO: "Fechado",
  PERDIDO: "Perdido"
};

export const followUpSequenceStatusLabels: Record<FollowUpSequenceStatus, string> = {
  ACTIVE: "Ativa",
  PAUSED: "Pausada",
  COMPLETED: "Concluída",
  CANCELED: "Cancelada"
};
