import { ContactEventType, FollowUpSequenceStatus, PipelineStage, PrismaClient } from "@prisma/client";
import { messageSentSequenceUpdate } from "@/lib/follow-up-sequence";

export async function backfillMessageSentFollowUps(prisma: PrismaClient) {
  const leads = await prisma.lead.findMany({
    where: {
      pipelineStage: PipelineStage.MENSAGEM_ENVIADA,
      OR: [
        { nextFollowUpAt: null },
        { firstMessageSentAt: null },
        { followUpSequenceStatus: { not: FollowUpSequenceStatus.ACTIVE } }
      ]
    },
    select: {
      id: true,
      firstMessageSentAt: true,
      firstContactAt: true,
      lastContactAt: true,
      nextFollowUpAt: true,
      followUpSequenceLength: true,
      createdAt: true,
      updatedAt: true
    }
  });

  for (const lead of leads) {
    const baseDate = lead.firstMessageSentAt ?? lead.firstContactAt ?? lead.lastContactAt ?? lead.updatedAt ?? lead.createdAt;
    const sequence = messageSentSequenceUpdate({
      now: new Date(),
      firstMessageSentAt: baseDate,
      firstContactAt: lead.firstContactAt,
      sequenceLength: lead.followUpSequenceLength
    });
    const nextFollowUpAt = lead.nextFollowUpAt ?? sequence.nextFollowUpAt;

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        ...sequence,
        nextFollowUpAt,
        followUps: nextFollowUpAt && !lead.nextFollowUpAt
          ? {
              create: {
                dueAt: nextFollowUpAt,
                type: sequence.followUpType,
                note: sequence.nextAction
              }
            }
          : undefined,
        histories: {
          create: {
            type: ContactEventType.FOLLOW_UP,
            title: "Backfill de follow-up automático",
            message: sequence.nextAction
          }
        }
      }
    });
  }

  return leads.length;
}
