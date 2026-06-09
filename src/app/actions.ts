"use server";

import { Prisma, ContactEventType, LeadStatus, PipelineStage } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { normalizeLeadInput } from "@/lib/normalizers";
import { prisma } from "@/lib/prisma";
import {
  demoSiteSchema,
  generatedMessageSchema,
  historySchema,
  leadApproachSchema,
  leadSchema,
  linkDemoSchema,
  loginSchema,
  pipelineStageSchema,
  scheduleFollowUpSchema,
  scriptSchema
} from "@/lib/validators";
import { pipelineStageLabels } from "@/lib/labels";

type ActionState = {
  ok?: boolean;
  error?: string;
  duplicate?: Awaited<ReturnType<typeof findDuplicateLead>>;
};

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function duplicateLeadMessage(duplicate: NonNullable<ActionState["duplicate"]>) {
  const name = duplicate.companyName ?? duplicate.responsibleName ?? "lead sem nome";
  return `Lead duplicado encontrado: ${name}`;
}

function uniqueConstraintMessage(error: Prisma.PrismaClientKnownRequestError) {
  const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : String(error.meta?.target ?? "");

  if (target.includes("whatsapp")) return "Já existe um lead com este WhatsApp.";
  if (target.includes("instagram")) return "Já existe um lead com este Instagram.";
  if (target.includes("email")) return "Já existe um lead com este e-mail.";

  return "Já existe um lead com estes dados.";
}

function stageFromStatus(status: LeadStatus): PipelineStage {
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

async function findDuplicateLead(data: {
  whatsappNormalized?: string | null;
  instagramNormalized?: string | null;
  emailNormalized?: string | null;
  companyNameNormalized?: string | null;
  id?: string;
}) {
  const conditions: Prisma.LeadWhereInput[] = [];
  if (data.whatsappNormalized) conditions.push({ whatsappNormalized: data.whatsappNormalized });
  if (data.instagramNormalized) conditions.push({ instagramNormalized: data.instagramNormalized });
  if (data.emailNormalized) conditions.push({ emailNormalized: data.emailNormalized });
  if (data.companyNameNormalized) conditions.push({ companyNameNormalized: data.companyNameNormalized });
  if (!conditions.length) return null;

  return prisma.lead.findFirst({
    where: {
      OR: conditions,
      ...(data.id ? { NOT: { id: data.id } } : {})
    },
    select: {
      id: true,
      responsibleName: true,
      companyName: true,
      whatsapp: true,
      instagram: true,
      email: true,
      status: true
    }
  });
}

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: "Informe e-mail e senha válidos." };

  const ok = await signIn(parsed.data.email, parsed.data.password);
  if (!ok) return { error: "Credenciais inválidas." };
  redirect("/hoje");
}

export async function logoutAction() {
  await signOut();
  redirect("/login");
}

export async function createLeadAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = leadSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const normalized = normalizeLeadInput(parsed.data);
  const duplicate = await findDuplicateLead(normalized);
  if (duplicate && !parsed.data.forceDuplicate) {
    return { error: duplicateLeadMessage(duplicate), duplicate };
  }

  let leadId: string;
  try {
    const lead = await prisma.lead.create({
      data: {
        ...normalized,
        proposedValue: normalized.proposedValue ?? null,
        pipelineStage: normalized.pipelineStage ?? stageFromStatus(normalized.status),
        histories:
          normalized.firstContactAt || normalized.lastContactAt
            ? {
                create: {
                  type: ContactEventType.FIRST_CONTACT,
                  title: "Lead cadastrado",
                  message: normalized.notes ?? null
                }
              }
            : undefined,
        followUps: normalized.nextFollowUpAt
          ? {
              create: {
                dueAt: normalized.nextFollowUpAt,
                type: normalized.followUpType ?? "Follow-up",
                note: normalized.nextStepNote ?? null
              }
            }
          : undefined,
        deals: normalized.proposedValue
          ? {
              create: {
                title: `Proposta - ${normalized.offeredService}`,
                value: normalized.proposedValue,
                won: normalized.status === LeadStatus.WON,
                closedAt: normalized.status === LeadStatus.WON ? new Date() : null
              }
            }
          : undefined
      }
    });
    leadId = lead.id;
  } catch (error) {
    console.error("ERRO AO CADASTRAR LEAD:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: uniqueConstraintMessage(error) };
    }

    return { error: "Não foi possível cadastrar o lead. Verifique os campos informados e tente novamente." };
  }

  revalidatePath("/");
  redirect(`/leads/${leadId}`);
}

export async function updateLeadAction(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = leadSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const normalized = normalizeLeadInput(parsed.data);
  const duplicate = await findDuplicateLead({ ...normalized, id });
  if (duplicate && !parsed.data.forceDuplicate) {
    return { error: duplicateLeadMessage(duplicate), duplicate };
  }

  try {
    await prisma.lead.update({
      where: { id },
      data: {
        ...normalized,
        proposedValue: normalized.proposedValue ?? null,
        pipelineStage: normalized.pipelineStage ?? stageFromStatus(normalized.status),
        followUps: normalized.nextFollowUpAt
          ? {
              create: {
                dueAt: normalized.nextFollowUpAt,
                type: normalized.followUpType ?? "Follow-up",
                note: normalized.nextStepNote ?? null
              }
            }
          : undefined
      }
    });
  } catch (error) {
    console.error("ERRO AO ATUALIZAR LEAD:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: uniqueConstraintMessage(error) };
    }

    return { error: "Não foi possível atualizar o lead. Verifique os campos informados e tente novamente." };
  }

  revalidatePath("/");
  revalidatePath(`/leads/${id}`);
  redirect(`/leads/${id}`);
}

export async function deleteLeadAction(id: string) {
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/leads");
  redirect("/leads");
}

export async function updateLeadStatusAction(id: string, status: LeadStatus) {
  await prisma.lead.update({
    where: { id },
    data: {
      status,
      lastContactAt: new Date(),
      histories: {
        create: {
          type: status === LeadStatus.WON ? ContactEventType.CLIENT_WON : status === LeadStatus.LOST ? ContactEventType.CLIENT_DECLINED : ContactEventType.FOLLOW_UP,
          title: `Status alterado para ${status}`,
          message: null
        }
      }
    }
  });
  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/kanban");
}

export async function updateLeadPipelineStageAction(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = pipelineStageSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Etapa inválida." };

  try {
    const lead = await prisma.lead.findUnique({ where: { id }, select: { pipelineStage: true } });
    if (!lead) return { error: "Lead não encontrado." };

    if (lead.pipelineStage === parsed.data.pipelineStage) return { ok: true };

    await prisma.lead.update({
      where: { id },
      data: {
        pipelineStage: parsed.data.pipelineStage,
        lastContactAt: new Date(),
        histories: {
          create: {
            type: ContactEventType.PIPELINE_CHANGED,
            title: "Pipeline alterado",
            message: `Pipeline alterado de ${pipelineStageLabels[lead.pipelineStage]} para ${pipelineStageLabels[parsed.data.pipelineStage]}`
          }
        }
      }
    });
  } catch (error) {
    console.error("ERRO AO ALTERAR PIPELINE DO LEAD:", { id, error });
    return { error: "Não foi possível alterar a etapa do pipeline." };
  }

  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/kanban");
  return { ok: true };
}

function revalidateLeadWorkspaces(leadId: string) {
  revalidatePath("/");
  revalidatePath("/hoje");
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/follow-ups");
  revalidatePath("/kanban");
}

export async function markLeadMessageSentAction(leadId: string): Promise<ActionState> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { pipelineStage: true, status: true }
    });
    if (!lead) return { error: "Lead não encontrado." };
    if (lead.pipelineStage === PipelineStage.FECHADO || lead.pipelineStage === PipelineStage.PERDIDO) {
      return { error: "Lead fechado ou perdido não pode ser marcado como mensagem enviada." };
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: LeadStatus.CONTACTED,
        pipelineStage: PipelineStage.MENSAGEM_ENVIADA,
        lastContactAt: new Date(),
        histories: {
          create: {
            type: ContactEventType.PIPELINE_CHANGED,
            title: "Mensagem enviada",
            message:
              lead.pipelineStage === PipelineStage.MENSAGEM_ENVIADA
                ? "Mensagem enviada registrada novamente."
                : `Pipeline alterado de ${pipelineStageLabels[lead.pipelineStage]} para ${pipelineStageLabels[PipelineStage.MENSAGEM_ENVIADA]}`
          }
        }
      }
    });
  } catch (error) {
    console.error("ERRO AO MARCAR MENSAGEM ENVIADA:", { leadId, error });
    return { error: "Não foi possível marcar a mensagem como enviada." };
  }

  revalidateLeadWorkspaces(leadId);
  return { ok: true };
}

export async function markLeadMessageSentFormAction(leadId: string, _: ActionState): Promise<ActionState> {
  return markLeadMessageSentAction(leadId);
}

export async function scheduleLeadFollowUpAction(leadId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = scheduleFollowUpSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const nextFollowUpAt = parsed.data.nextFollowUpAt;
  if (!nextFollowUpAt) return { error: "Informe a data do follow-up." };

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { pipelineStage: true }
    });
    if (!lead) return { error: "Lead não encontrado." };
    if (lead.pipelineStage === PipelineStage.FECHADO || lead.pipelineStage === PipelineStage.PERDIDO) {
      return { error: "Lead fechado ou perdido não pode receber novo follow-up." };
    }

    const followUpType = parsed.data.followUpType ?? "Follow-up";
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        nextFollowUpAt,
        followUpType,
        nextStepNote: parsed.data.nextStepNote,
        followUps: {
          create: {
            dueAt: nextFollowUpAt,
            type: followUpType,
            note: parsed.data.nextStepNote
          }
        },
        histories: {
          create: {
            type: ContactEventType.FOLLOW_UP,
            title: "Follow-up agendado",
            message: parsed.data.nextStepNote ?? `Próximo follow-up: ${nextFollowUpAt.toLocaleDateString("pt-BR")}`
          }
        }
      }
    });
  } catch (error) {
    console.error("ERRO AO AGENDAR FOLLOW-UP:", { leadId, error });
    return { error: "Não foi possível agendar o follow-up." };
  }

  revalidateLeadWorkspaces(leadId);
  return { ok: true };
}

export async function markLeadLostAction(leadId: string): Promise<ActionState> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { pipelineStage: true }
    });
    if (!lead) return { error: "Lead não encontrado." };
    if (lead.pipelineStage === PipelineStage.PERDIDO) return { ok: true };

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: LeadStatus.LOST,
        pipelineStage: PipelineStage.PERDIDO,
        lastContactAt: new Date(),
        histories: {
          create: {
            type: ContactEventType.PIPELINE_CHANGED,
            title: "Lead marcado como perdido",
            message: `Pipeline alterado de ${pipelineStageLabels[lead.pipelineStage]} para ${pipelineStageLabels[PipelineStage.PERDIDO]}`
          }
        }
      }
    });
  } catch (error) {
    console.error("ERRO AO MARCAR LEAD COMO PERDIDO:", { leadId, error });
    return { error: "Não foi possível marcar o lead como perdido." };
  }

  revalidateLeadWorkspaces(leadId);
  return { ok: true };
}

export async function markLeadLostFormAction(leadId: string, _: ActionState): Promise<ActionState> {
  return markLeadLostAction(leadId);
}

export async function addHistoryAction(leadId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = historySchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  await prisma.contactHistory.create({ data: { leadId, ...parsed.data } });
  await prisma.lead.update({ where: { id: leadId }, data: { lastContactAt: new Date() } });
  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

export async function createScriptAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = scriptSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  await prisma.scriptTemplate.create({ data: parsed.data });
  revalidatePath("/scripts");
  return { ok: true };
}

export async function updateScriptAction(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = scriptSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  await prisma.scriptTemplate.update({ where: { id }, data: parsed.data });
  revalidatePath("/scripts");
  return { ok: true };
}

export async function saveGeneratedMessageAction(leadId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = generatedMessageSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Mensagem inválida." };

  try {
    await prisma.contactHistory.create({
      data: {
        leadId,
        type: ContactEventType.MESSAGE_GENERATED,
        title: `Mensagem gerada: ${parsed.data.type}`,
        message: parsed.data.message
      }
    });
    await prisma.lead.update({ where: { id: leadId }, data: { lastContactAt: new Date() } });
  } catch (error) {
    console.error("ERRO AO SALVAR MENSAGEM GERADA:", { leadId, error });
    return { error: "Não foi possível salvar a mensagem no histórico." };
  }

  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

export async function saveLeadApproachAction(leadId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = leadApproachSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Abordagem inválida." };

  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        recommendedProduct: parsed.data.recommendedProduct,
        demoUrl: parsed.data.demoUrl,
        audit: parsed.data.audit,
        approachScript: parsed.data.approachScript,
        histories: {
          create: {
            type: ContactEventType.MESSAGE_GENERATED,
            title: "Abordagem pronta atualizada",
            message: parsed.data.approachScript
          }
        }
      }
    });
  } catch (error) {
    console.error("ERRO AO SALVAR ABORDAGEM DO LEAD:", { leadId, error });
    return { error: "Não foi possível salvar a abordagem pronta." };
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/kanban");
  return { ok: true };
}

export async function createDemoSiteAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = demoSiteSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    await prisma.demoSite.create({ data: parsed.data });
  } catch (error) {
    console.error("ERRO AO CADASTRAR DEMO:", error);
    return { error: "Não foi possível cadastrar a demo." };
  }

  revalidatePath("/demos");
  return { ok: true };
}

export async function updateDemoSiteAction(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = demoSiteSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    await prisma.demoSite.update({ where: { id }, data: parsed.data });
  } catch (error) {
    console.error("ERRO AO ATUALIZAR DEMO:", { id, error });
    return { error: "Não foi possível atualizar a demo." };
  }

  revalidatePath("/demos");
  return { ok: true };
}

export async function archiveDemoSiteAction(id: string) {
  try {
    await prisma.demoSite.update({ where: { id }, data: { status: "ARCHIVED" } });
  } catch (error) {
    console.error("ERRO AO ARQUIVAR DEMO:", { id, error });
  }

  revalidatePath("/demos");
}

export async function linkDemoToLeadAction(leadId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = linkDemoSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Selecione uma demo válida." };

  try {
    const demo = await prisma.demoSite.findUnique({ where: { id: parsed.data.demoSiteId } });
    if (!demo) return { error: "Demo não encontrada." };

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        demoSiteId: demo.id,
        demoUrl: demo.url,
        pipelineStage: PipelineStage.DEMO_CRIADA,
        histories: {
          create: {
            type: ContactEventType.DEMO_LINKED,
            title: "Demo vinculada",
            message: `Demo vinculada: ${demo.name} - ${demo.url}`
          }
        }
      }
    });
  } catch (error) {
    console.error("ERRO AO VINCULAR DEMO AO LEAD:", { leadId, error });
    return { error: "Não foi possível vincular a demo ao lead." };
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/kanban");
  return { ok: true };
}
