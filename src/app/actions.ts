"use server";

import { Prisma, ContactEventType, FollowUpSequenceStatus, LeadStatus, PipelineStage } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { demoUrlFromSlug, uniqueDemoSlug } from "@/lib/demo-url";
import {
  canceledSequenceUpdate,
  followUpSentSequenceUpdate,
  isAdvancedPipelineStage,
  messageSentSequenceUpdate,
  nextFollowUpAction,
  normalizeSequenceLength,
  pausedSequenceUpdate,
  statusFromPipelineStage
} from "@/lib/follow-up-sequence";
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
  if (target.includes("demoSlug")) return "Já existe uma demo com este slug.";

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
  const now = new Date();
  const pipelineStage = stageFromStatus(status);
  const shouldCancelSequence = isAdvancedPipelineStage(pipelineStage);
  const lead =
    status === LeadStatus.CONTACTED
      ? await prisma.lead.findUnique({
          where: { id },
          select: {
            firstContactAt: true,
            firstMessageSentAt: true,
            nextFollowUpAt: true,
            followUpCount: true,
            followUpSequenceLength: true,
            followUpSequenceStatus: true
          }
        })
      : null;
  const contactedSequence =
    status === LeadStatus.CONTACTED && lead?.firstMessageSentAt && lead.followUpCount === 0 && lead.nextFollowUpAt && lead.followUpSequenceStatus === FollowUpSequenceStatus.ACTIVE
      ? {}
      : status === LeadStatus.CONTACTED
        ? messageSentSequenceUpdate({
            now,
            firstContactAt: lead?.firstContactAt,
            firstMessageSentAt: lead?.firstMessageSentAt,
            sequenceLength: lead?.followUpSequenceLength
          })
        : {};

  await prisma.lead.update({
    where: { id },
    data: {
      status,
      pipelineStage,
      lastContactAt: now,
      ...(status === LeadStatus.CONTACTED ? contactedSequence : shouldCancelSequence ? canceledSequenceUpdate(pipelineStageLabels[pipelineStage]) : {}),
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

    const shouldCancelSequence = isAdvancedPipelineStage(parsed.data.pipelineStage);
    await prisma.lead.update({
      where: { id },
      data: {
        pipelineStage: parsed.data.pipelineStage,
        status: statusFromPipelineStage(parsed.data.pipelineStage),
        lastContactAt: new Date(),
        ...(shouldCancelSequence ? canceledSequenceUpdate(pipelineStageLabels[parsed.data.pipelineStage]) : {}),
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
      select: {
        pipelineStage: true,
        status: true,
        firstContactAt: true,
        firstMessageSentAt: true,
        nextFollowUpAt: true,
        followUpCount: true,
        followUpSequenceLength: true,
        followUpSequenceStatus: true
      }
    });
    if (!lead) return { error: "Lead não encontrado." };
    if (lead.pipelineStage === PipelineStage.FECHADO || lead.pipelineStage === PipelineStage.PERDIDO) {
      return { error: "Lead fechado ou perdido não pode ser marcado como mensagem enviada." };
    }

    if (
      lead.firstMessageSentAt &&
      lead.followUpCount === 0 &&
      lead.nextFollowUpAt &&
      lead.followUpSequenceStatus === FollowUpSequenceStatus.ACTIVE
    ) {
      return { ok: true };
    }

    const now = new Date();
    const sequence = messageSentSequenceUpdate({
      now,
      firstMessageSentAt: lead.firstMessageSentAt,
      firstContactAt: lead.firstContactAt,
      sequenceLength: lead.followUpSequenceLength
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: LeadStatus.CONTACTED,
        pipelineStage: PipelineStage.MENSAGEM_ENVIADA,
        ...sequence,
        followUps: sequence.nextFollowUpAt
          ? {
              create: {
                dueAt: sequence.nextFollowUpAt,
                type: sequence.followUpType,
                note: sequence.nextAction
              }
            }
          : undefined,
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

export async function markLeadFollowUpSentAction(leadId: string): Promise<ActionState> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        pipelineStage: true,
        firstMessageSentAt: true,
        nextFollowUpAt: true,
        followUpCount: true,
        followUpSequenceLength: true,
        followUpSequenceStatus: true
      }
    });
    if (!lead) return { error: "Lead não encontrado." };
    if (lead.pipelineStage === PipelineStage.FECHADO || lead.pipelineStage === PipelineStage.PERDIDO) {
      return { error: "Lead fechado ou perdido não pode receber follow-up." };
    }
    if (lead.followUpSequenceStatus !== FollowUpSequenceStatus.ACTIVE) {
      return { error: "A sequência de follow-up não está ativa." };
    }

    const now = new Date();
    const firstMessageSentAt = lead.firstMessageSentAt ?? now;
    const sentStep = Math.min(lead.followUpCount + 1, normalizeSequenceLength(lead.followUpSequenceLength));
    const sequence = followUpSentSequenceUpdate({
      now,
      firstMessageSentAt,
      followUpCount: lead.followUpCount,
      sequenceLength: lead.followUpSequenceLength
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        firstMessageSentAt,
        ...sequence,
        followUps: {
          updateMany: {
            where: {
              completedAt: null,
              ...(lead.nextFollowUpAt ? { dueAt: lead.nextFollowUpAt } : {})
            },
            data: { completedAt: now }
          },
          ...(sequence.nextFollowUpAt
            ? {
                create: {
                  dueAt: sequence.nextFollowUpAt,
                  type: sequence.followUpType ?? "Follow-up",
                  note: sequence.nextAction
                }
              }
            : {})
        },
        histories: {
          create: {
            type: ContactEventType.FOLLOW_UP,
            title: `Follow-up ${sentStep} enviado`,
            message:
              sequence.followUpSequenceStatus === FollowUpSequenceStatus.COMPLETED
                ? "Sequência de follow-ups concluída."
                : sequence.nextAction
          }
        }
      }
    });
  } catch (error) {
    console.error("ERRO AO MARCAR FOLLOW-UP ENVIADO:", { leadId, error });
    return { error: "Não foi possível marcar o follow-up como enviado." };
  }

  revalidateLeadWorkspaces(leadId);
  return { ok: true };
}

export async function markLeadFollowUpSentFormAction(leadId: string, _: ActionState): Promise<ActionState> {
  return markLeadFollowUpSentAction(leadId);
}

export async function pauseLeadFollowUpSequenceFormAction(leadId: string, _: ActionState): Promise<ActionState> {
  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        ...pausedSequenceUpdate(),
        histories: {
          create: {
            type: ContactEventType.FOLLOW_UP,
            title: "Sequência pausada",
            message: "Sequência automática de follow-ups pausada."
          }
        }
      }
    });
  } catch (error) {
    console.error("ERRO AO PAUSAR SEQUÊNCIA:", { leadId, error });
    return { error: "Não foi possível pausar a sequência." };
  }

  revalidateLeadWorkspaces(leadId);
  return { ok: true };
}

export async function cancelLeadFollowUpSequenceFormAction(leadId: string, _: ActionState): Promise<ActionState> {
  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        ...canceledSequenceUpdate(),
        histories: {
          create: {
            type: ContactEventType.FOLLOW_UP,
            title: "Sequência cancelada",
            message: "Sequência automática de follow-ups cancelada."
          }
        }
      }
    });
  } catch (error) {
    console.error("ERRO AO CANCELAR SEQUÊNCIA:", { leadId, error });
    return { error: "Não foi possível cancelar a sequência." };
  }

  revalidateLeadWorkspaces(leadId);
  return { ok: true };
}

export async function moveLeadToRespondedFormAction(leadId: string, _: ActionState): Promise<ActionState> {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { pipelineStage: true } });
    if (!lead) return { error: "Lead não encontrado." };

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: LeadStatus.RESPONDED,
        pipelineStage: PipelineStage.RESPONDEU,
        lastContactAt: new Date(),
        ...canceledSequenceUpdate(pipelineStageLabels[PipelineStage.RESPONDEU]),
        histories: {
          create: {
            type: ContactEventType.CLIENT_REPLIED,
            title: "Lead moveu para respondeu",
            message: `Pipeline alterado de ${pipelineStageLabels[lead.pipelineStage]} para ${pipelineStageLabels[PipelineStage.RESPONDEU]}`
          }
        }
      }
    });
  } catch (error) {
    console.error("ERRO AO MOVER LEAD PARA RESPONDEU:", { leadId, error });
    return { error: "Não foi possível mover o lead para respondeu." };
  }

  revalidateLeadWorkspaces(leadId);
  return { ok: true };
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
        nextAction: parsed.data.nextStepNote ?? "Follow-up agendado",
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
        ...canceledSequenceUpdate(pipelineStageLabels[PipelineStage.PERDIDO]),
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
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, companyName: true, demoSlug: true }
    });
    if (!lead) return { error: "Lead não encontrado." };

    const demoSlug = lead.demoSlug ?? (await uniqueDemoSlug(prisma, {
      leadId,
      companyName: lead.companyName,
      demoSlug: parsed.data.demoSlug
    }));

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        recommendedProduct: parsed.data.recommendedProduct,
        demoUrl: demoUrlFromSlug(demoSlug),
        demoSlug,
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
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, companyName: true, demoSlug: true }
    });
    if (!lead) return { error: "Lead não encontrado." };

    const demoSlug = lead.demoSlug ?? (await uniqueDemoSlug(prisma, {
      leadId,
      companyName: lead.companyName
    }));

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        demoSiteId: demo.id,
        demoSlug,
        demoUrl: demoUrlFromSlug(demoSlug),
        pipelineStage: PipelineStage.DEMO_CRIADA,
        histories: {
          create: {
            type: ContactEventType.DEMO_LINKED,
            title: "Demo vinculada",
            message: `Demo vinculada: ${demo.name} - ${demoUrlFromSlug(demoSlug)}`
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
