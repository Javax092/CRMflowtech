import { ContactEventType, PipelineStage } from "@prisma/client";
import { NextResponse } from "next/server";
import { pipelineStageLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as { pipelineStage?: PipelineStage };

  if (!body.pipelineStage || !Object.values(PipelineStage).includes(body.pipelineStage)) {
    return NextResponse.json({ error: "Etapa inválida." }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id }, select: { pipelineStage: true } });
  if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

  await prisma.lead.update({
    where: { id },
    data: {
      pipelineStage: body.pipelineStage,
      lastContactAt: new Date(),
      histories:
        lead.pipelineStage === body.pipelineStage
          ? undefined
          : {
              create: {
                type: ContactEventType.PIPELINE_CHANGED,
                title: "Pipeline alterado",
                message: `Pipeline alterado de ${pipelineStageLabels[lead.pipelineStage]} para ${pipelineStageLabels[body.pipelineStage]}`
              }
            }
    }
  });

  return NextResponse.json({ ok: true });
}
