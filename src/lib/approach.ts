import { OfferedService, Segment } from "@prisma/client";

type LeadApproachInput = {
  responsibleName?: string | null;
  companyName?: string | null;
  segment: Segment | string;
  instagram?: string | null;
  websiteUrl?: string | null;
  notes?: string | null;
  audit?: string | null;
  demoUrl?: string | null;
  offeredService?: OfferedService | string | null;
  recommendedProduct?: string | null;
};

const segmentNames: Record<string, string> = {
  LAW: "advocacia",
  NUTRITION: "nutrição",
  VETERINARY: "veterinaria",
  PETSHOP: "petshop",
  CLINIC: "clínica",
  RESTAURANT: "restaurante",
  OTHER: "negócio local"
};

const productByService: Record<string, string> = {
  WEBSITE: "Site profissional premium",
  SYSTEM: "Sistema web sob medida",
  AUTOMATION: "Automação de processos",
  SEO: "Site profissional premium",
  MONTHLY_MAINTENANCE: "CRM inteligente"
};

const productBySegment: Record<string, string> = {
  VETERINARY: "VetPet",
  PETSHOP: "PetEstoque",
  CLINIC: "CRM inteligente",
  LAW: "Site profissional premium",
  NUTRITION: "Site profissional premium",
  RESTAURANT: "Automação de processos",
  OTHER: "IA para empresas"
};

function clean(value?: string | null) {
  return value?.trim() || null;
}

function segmentLabel(segment: Segment | string) {
  return segmentNames[String(segment)] ?? String(segment).toLowerCase();
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function recommendedProductForLead(lead: Pick<LeadApproachInput, "segment" | "offeredService" | "recommendedProduct">) {
  if (clean(lead.recommendedProduct)) return clean(lead.recommendedProduct) as string;
  if (lead.offeredService && productByService[String(lead.offeredService)]) return productByService[String(lead.offeredService)];
  return productBySegment[String(lead.segment)] ?? "IA para empresas";
}

function businessObservation(lead: LeadApproachInput) {
  const company = clean(lead.companyName) ?? "o negócio";
  const segment = segmentLabel(lead.segment);

  if (lead.instagram && lead.websiteUrl) {
    return `Vi o Instagram e o site da ${company}; dá para aproveitar melhor esse tráfego para converter interessados em conversas no WhatsApp.`;
  }

  if (lead.instagram) {
    return `Vi o Instagram da ${company} e percebi que já existe uma presença ativa, mas ainda há espaço para transformar mais visitas em contatos qualificados.`;
  }

  if (lead.websiteUrl) {
    return `Analisei o site da ${company} e notei oportunidade de deixar a jornada mais direta para quem quer entender o serviço e chamar no WhatsApp.`;
  }

  return `Pelo perfil de ${segment} da ${company}, existe uma oportunidade clara de organizar melhor a primeira impressão digital e o atendimento.`;
}

function opportunity(lead: LeadApproachInput) {
  const context = clean(lead.audit) ?? clean(lead.notes);
  if (context) return context;

  const segment = normalizeText(segmentLabel(lead.segment));
  if (segment.includes("veterinaria") || segment.includes("petshop")) {
    return "centralizar agendamentos, estoque/serviços e atendimento pode reduzir trabalho manual e evitar perda de clientes por demora na resposta.";
  }
  if (segment.includes("advocacia")) {
    return "um canal profissional com informações claras aumenta confiança e ajuda a filtrar contatos com mais intenção.";
  }
  if (segment.includes("nutricao") || segment.includes("clinica")) {
    return "facilitar agendamento e apresentar serviços com clareza tende a aumentar a percepção de valor antes da primeira conversa.";
  }
  if (segment.includes("restaurante")) {
    return "organizar cardápio, pedidos e WhatsApp em um fluxo simples pode diminuir atrito e aumentar pedidos recorrentes.";
  }
  return "melhorar presença digital, atendimento e organização comercial pode gerar mais conversas qualificadas sem aumentar a rotina manual.";
}

export function generateLeadApproach(lead: LeadApproachInput) {
  const name = clean(lead.responsibleName) ?? "tudo bem";
  const company = clean(lead.companyName) ?? "sua empresa";
  const product = recommendedProductForLead(lead);
  const observation = businessObservation(lead);
  const identifiedOpportunity = opportunity(lead);
  const demoLine = lead.demoUrl ? `\n\nDemonstração: ${lead.demoUrl}` : "";

  return `Mensagem curta para WhatsApp:
Olá, ${name}. ${observation}

Vi uma oportunidade em ${identifiedOpportunity}

Na FlowtechAM, eu pensei em uma solução com ${product} para deixar esse processo mais claro, profissional e fácil de acompanhar.${demoLine}

Faz sentido conversarmos por 10 minutos para eu te mostrar o caminho mais simples?

Mensagem consultiva:
Olá, ${name}. Fiz uma leitura rápida da presença digital da ${company} e percebi alguns pontos que podem impactar diretamente a geração de contatos e a organização do atendimento.

O principal diagnóstico é: ${identifiedOpportunity}

Minha sugestão inicial seria avaliar uma solução de ${product}, focada em aumentar valor percebido, reduzir atrito no primeiro contato e dar mais previsibilidade ao processo comercial.${lead.demoUrl ? ` Tenho uma demonstração que ajuda a visualizar a ideia: ${lead.demoUrl}` : ""}

Se fizer sentido, posso te mostrar o diagnóstico em uma conversa objetiva, sem compromisso.

Follow-up 1:
Olá, ${name}. Passando rapidamente para saber se você conseguiu ver a ideia para a ${company}. A oportunidade principal está em ${identifiedOpportunity} Faz sentido eu te explicar em poucos minutos?

Follow-up 2:
Olá, ${name}. Vou encerrar esta análise por enquanto, mas quis te avisar antes porque a ${company} pode estar perdendo contatos por pontos simples de presença digital e atendimento. Se quiser, te mostro o diagnóstico e uma solução com ${product} de forma bem objetiva.`;
}

export function splitLeadApproachSections(script: string) {
  const section = (title: string, nextTitle?: string) => {
    const start = script.indexOf(`${title}:`);
    if (start < 0) return "";
    const bodyStart = start + title.length + 1;
    const end = nextTitle ? script.indexOf(`${nextTitle}:`, bodyStart) : -1;
    return script.slice(bodyStart, end >= 0 ? end : undefined).trim();
  };

  return {
    whatsapp: section("Mensagem curta para WhatsApp", "Mensagem consultiva"),
    consultative: section("Mensagem consultiva", "Follow-up 1"),
    followUp1: section("Follow-up 1", "Follow-up 2"),
    followUp2: section("Follow-up 2")
  };
}
