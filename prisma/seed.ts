import { Prisma, PrismaClient, LeadStatus, Segment, OfferedService, LeadSource, ScriptType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { normalizeLeadInput } from "../src/lib/normalizers";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: "admin@flowtecham.com" },
    update: {},
    create: {
      name: "Administrador FlowtechAM",
      email: "admin@flowtecham.com",
      passwordHash: await bcrypt.hash("admin123", 10)
    }
  });

  const leads: Array<
    Omit<Prisma.LeadCreateInput, "histories" | "followUps" | "deals"> & {
      proposedValue?: number;
      whatsapp: string;
    }
  > = [
    {
      responsibleName: "Marina Alves",
      companyName: "Alves Advocacia",
      segment: Segment.LAW,
      instagram: "@alvesadv",
      whatsapp: "(92) 98888-1001",
      email: "contato@alvesadv.com.br",
      city: "Manaus",
      demoUrl: "https://demo.flowtecham.com/alves",
      offeredService: OfferedService.WEBSITE,
      proposedValue: 2800,
      status: LeadStatus.PROPOSAL_SENT,
      source: LeadSource.INSTAGRAM,
      notes: "Gostou do modelo institucional com captação via WhatsApp.",
      firstContactAt: new Date(),
      lastContactAt: new Date(),
      nextFollowUpAt: new Date(Date.now() + 86400000),
      followUpType: "WhatsApp",
      nextStepNote: "Enviar condições de pagamento."
    },
    {
      responsibleName: "Bruno Costa",
      companyName: "Nutri Vida",
      segment: Segment.NUTRITION,
      instagram: "nutrivida.am",
      whatsapp: "92977771002",
      email: "agenda@nutrivida.com",
      city: "Manaus",
      offeredService: OfferedService.AUTOMATION,
      proposedValue: 1500,
      status: LeadStatus.INTERESTED,
      source: LeadSource.GOOGLE_MAPS,
      notes: "Quer automatizar triagem de pacientes.",
      nextFollowUpAt: new Date()
    },
    {
      responsibleName: "Carla Nogueira",
      companyName: "Pet Center Norte",
      segment: Segment.PETSHOP,
      instagram: "@petcenternorte",
      whatsapp: "92966661003",
      city: "Manaus",
      offeredService: OfferedService.MONTHLY_MAINTENANCE,
      proposedValue: 900,
      status: LeadStatus.WON,
      source: LeadSource.REFERRAL,
      notes: "Fechou manutenção mensal e landing page.",
      firstContactAt: new Date(),
      lastContactAt: new Date()
    }
  ];

  for (const lead of leads) {
    const data = normalizeLeadInput(lead);
    await prisma.lead.upsert({
      where: { whatsappNormalized: data.whatsappNormalized ?? "" },
      update: {},
      create: {
        ...data,
        deals: data.proposedValue
          ? {
              create: {
                title: `Proposta ${data.companyName}`,
                value: data.proposedValue,
                won: data.status === LeadStatus.WON,
                closedAt: data.status === LeadStatus.WON ? new Date() : null
              }
            }
          : undefined,
        histories: {
          create: {
            type: "FIRST_CONTACT",
            title: "Lead importado no seed",
            message: data.notes
          }
        }
      }
    });
  }

  const scripts = [
    {
      name: "Primeira abordagem consultiva",
      type: ScriptType.FIRST_APPROACH,
      content: "Olá, {{nome}}. Sou da FlowtechAM e vi a {{empresa}}. Preparei uma ideia de {{servico}} para melhorar a captação no segmento de {{segmento}}. Posso te enviar a demonstração?"
    },
    {
      name: "Follow-up com demo",
      type: ScriptType.FOLLOW_UP_1,
      content: "Olá! Tudo bem? Passando apenas para confirmar se você conseguiu visualizar a mensagem que enviei sobre algumas oportunidades que identifiquei para o seu negócio. Posso te mostrar rapidamente o que encontrei? 😊"
    },
    {
      name: "Follow-up com oportunidade",
      type: ScriptType.FOLLOW_UP_2,
      content: "Olá! Continuei analisando a presença digital da empresa e encontrei alguns pontos interessantes que podem gerar mais clientes sem aumentar investimento em anúncios. Achei que valeria a pena compartilhar. Posso te mostrar?"
    },
    {
      name: "Follow-up de encerramento",
      type: ScriptType.FOLLOW_UP_3,
      content: "Olá! Imagino que a rotina esteja corrida. Vou encerrar este contato para não incomodar. Mas caso tenha interesse em conhecer as oportunidades que identifiquei para aumentar as vendas e fortalecer a presença digital da empresa, fico à disposição. Sucesso para vocês! 🚀"
    },
    {
      name: "Proposta de mensalidade",
      type: ScriptType.MONTHLY_PROPOSAL,
      content: "{{nome}}, para manter a {{empresa}} sempre atualizada, posso incluir suporte mensal, ajustes e melhorias contínuas. Quer que eu te envie o plano?"
    }
  ];

  for (const script of scripts) {
    await prisma.scriptTemplate.upsert({
      where: { id: `${script.type.toLowerCase()}-seed` },
      update: script,
      create: { id: `${script.type.toLowerCase()}-seed`, ...script }
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
