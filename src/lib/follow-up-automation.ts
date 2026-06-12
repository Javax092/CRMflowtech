import { ContactEventType, FollowUpSequenceStatus, PipelineStage } from "@prisma/client";
import { z } from "zod";
import { followUpMessages, followUpSentSequenceUpdate, normalizeSequenceLength } from "@/lib/follow-up-sequence";
import { prisma } from "@/lib/prisma";

const defaultAutomationLimit = 15;
const maxAutomationLimit = 30;

export const followUpSentAutomationSchema = z.object({
  provider: z.string().trim().min(1),
  messageId: z.string().trim().min(1),
  sentAt: z.coerce.date()
});

export const followUpFailedAutomationSchema = z.object({
  provider: z.string().trim().min(1).optional(),
  messageId: z.string().trim().min(1).optional(),
  error: z.string().trim().min(1).max(1000),
  failedAt: z.coerce.date().optional()
});

type DueFollowUpRow = {
  id: string;
  responsibleName: string | null;
  companyName: string | null;
  phone: string | null;
  followUpCount: number;
  followUpSequenceLength: number;
  pipelineStage: PipelineStage;
};

export type DueFollowUpResponse = {
  id: string;
  name: string;
  phone: string;
  followUpCount: number;
  followUpSequenceLength: number;
  nextFollowUpNumber: number;
  message: string;
  pipelineStage: PipelineStage;
};

export function automationLimitFromSearch(searchParams: URLSearchParams) {
  const configured = Number(process.env.FOLLOW_UP_DAILY_LIMIT ?? defaultAutomationLimit);
  const requested = Number(searchParams.get("limit") ?? configured);
  const safeLimit = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : defaultAutomationLimit;

  return Math.min(safeLimit, maxAutomationLimit);
}

function cleanPhone(value: string | null) {
  return value?.replace(/\D/g, "") ?? "";
}

function leadDisplayName(lead: Pick<DueFollowUpRow, "companyName" | "responsibleName">) {
  return lead.companyName ?? lead.responsibleName ?? "Lead sem nome";
}

export async function getDueFollowUpsForAutomation(limit: number, now = new Date()): Promise<DueFollowUpResponse[]> {
  const rows = await prisma.$queryRaw<DueFollowUpRow[]>`
    SELECT
      "id",
      "responsibleName",
      "companyName",
      COALESCE(NULLIF("whatsappNormalized", ''), NULLIF("whatsapp", '')) AS "phone",
      "followUpCount",
      "followUpSequenceLength",
      "pipelineStage"
    FROM "Lead"
    WHERE "followUpSequenceStatus" = 'ACTIVE'::"FollowUpSequenceStatus"
      AND "nextFollowUpAt" <= ${now}
      AND "pipelineStage" = 'MENSAGEM_ENVIADA'::"PipelineStage"
      AND COALESCE(NULLIF("whatsappNormalized", ''), NULLIF("whatsapp", '')) IS NOT NULL
      AND "followUpCount" < "followUpSequenceLength"
    ORDER BY "nextFollowUpAt" ASC, "followUpCount" DESC, "proposedValue" DESC NULLS LAST
    LIMIT ${limit}
  `;

  const dueFollowUps = rows
    .map((lead) => {
      const sequenceLength = normalizeSequenceLength(lead.followUpSequenceLength);
      const nextFollowUpNumber = Math.min(lead.followUpCount + 1, sequenceLength) as 1 | 2 | 3;

      return {
        id: lead.id,
        name: leadDisplayName(lead),
        phone: cleanPhone(lead.phone),
        followUpCount: lead.followUpCount,
        followUpSequenceLength: sequenceLength,
        nextFollowUpNumber,
        message: followUpMessages[nextFollowUpNumber],
        pipelineStage: lead.pipelineStage
      };
    })
    .filter((lead) => lead.phone.length > 0);

  if (dueFollowUps.length) {
    await prisma.contactHistory.createMany({
      data: dueFollowUps.map((lead) => ({
        leadId: lead.id,
        type: ContactEventType.FOLLOW_UP_AUTOMATION_QUEUED,
        title: `Follow-up ${lead.nextFollowUpNumber} enfileirado para n8n`,
        message: "Lead retornado para envio automático via WhatsApp.",
        source: "n8n",
        provider: "automation"
      }))
    });
  }

  return dueFollowUps;
}

export async function markAutomationFollowUpSent(
  leadId: string,
  input: z.infer<typeof followUpSentAutomationSchema>
) {
  const sentAt = input.sentAt;
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        pipelineStage: true,
        firstMessageSentAt: true,
        nextFollowUpAt: true,
        followUpCount: true,
        followUpSequenceLength: true,
        followUpSequenceStatus: true,
        whatsapp: true,
        whatsappNormalized: true
      }
    });

    if (!lead) return { ok: false as const, status: 404, error: "Lead não encontrado." };
    if (
      lead.followUpSequenceStatus !== FollowUpSequenceStatus.ACTIVE ||
      lead.pipelineStage !== PipelineStage.MENSAGEM_ENVIADA ||
      !lead.nextFollowUpAt ||
      lead.nextFollowUpAt > now ||
      lead.followUpCount >= normalizeSequenceLength(lead.followUpSequenceLength) ||
      !cleanPhone(lead.whatsappNormalized ?? lead.whatsapp)
    ) {
      return { ok: false as const, status: 409, error: "Lead não está mais elegível para follow-up automático." };
    }

    const firstMessageSentAt = lead.firstMessageSentAt ?? sentAt;
    const sentStep = Math.min(lead.followUpCount + 1, normalizeSequenceLength(lead.followUpSequenceLength));
    const sequence = followUpSentSequenceUpdate({
      now: sentAt,
      firstMessageSentAt,
      followUpCount: lead.followUpCount,
      sequenceLength: lead.followUpSequenceLength
    });
    const completed = sequence.followUpSequenceStatus === FollowUpSequenceStatus.COMPLETED;

    const updatedLead = await tx.lead.update({
      where: { id: leadId },
      data: {
        firstMessageSentAt,
        ...sequence,
        followUps: {
          updateMany: {
            where: {
              completedAt: null,
              dueAt: lead.nextFollowUpAt
            },
            data: { completedAt: sentAt }
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
          create: [
            {
              type: ContactEventType.FOLLOW_UP_SENT_AUTOMATION,
              title: `Follow-up ${sentStep} enviado via n8n`,
              message: completed ? "Sequência de follow-ups concluída." : sequence.nextAction,
              source: "n8n",
              provider: input.provider,
              messageId: input.messageId,
              sentAt
            },
            ...(completed
              ? [
                  {
                    type: ContactEventType.FOLLOW_UP_SEQUENCE_COMPLETED,
                    title: "Sequência de follow-ups concluída",
                    message: "Último follow-up automático enviado.",
                    source: "n8n",
                    provider: input.provider,
                    messageId: input.messageId,
                    sentAt
                  }
                ]
              : [])
          ]
        }
      },
      select: {
        id: true,
        followUpCount: true,
        followUpSequenceLength: true,
        followUpSequenceStatus: true,
        lastFollowUpAt: true,
        lastContactAt: true,
        nextFollowUpAt: true,
        nextAction: true
      }
    });

    return { ok: true as const, lead: updatedLead };
  });
}

export async function markAutomationFollowUpFailed(
  leadId: string,
  input: z.infer<typeof followUpFailedAutomationSchema>
) {
  await prisma.contactHistory.create({
    data: {
      leadId,
      type: ContactEventType.FOLLOW_UP_SEND_FAILED,
      title: "Falha no envio automático de follow-up",
      message: input.error,
      source: "n8n",
      provider: input.provider,
      messageId: input.messageId,
      sentAt: input.failedAt
    }
  });
}
