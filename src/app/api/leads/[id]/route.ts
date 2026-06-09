import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { validateN8nApiKey } from "@/lib/api-auth";
import { isAuthenticated } from "@/lib/auth";
import {
  formatLeadForApi,
  historyForN8nUpdate,
  leadStatusFromApi,
  n8nLeadUpdateSchema,
  pipelineStageFromStatus
} from "@/lib/n8n-api";
import { prisma } from "@/lib/prisma";

async function validateLeadPatchAuth(request: Request) {
  if (await isAuthenticated()) return null;
  return validateN8nApiKey(request);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = await validateLeadPatchAuth(request);
  if (authError) return authError;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido." }, { status: 400 });
  }

  const parsed = n8nLeadUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  let status;
  try {
    status = parsed.data.status ? leadStatusFromApi(parsed.data.status) : undefined;
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Status inválido." }, { status: 400 });
  }

  try {
    const existing = await prisma.lead.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ success: false, error: "Lead não encontrado." }, { status: 404 });

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        status,
        pipelineStage: status ? pipelineStageFromStatus(status) : undefined,
        recommendedProduct: parsed.data.recommendedProduct,
        demoUrl: parsed.data.demoUrl,
        audit: parsed.data.audit,
        approachScript: parsed.data.approachScript,
        nextStepNote: parsed.data.nextAction,
        lastContactAt: new Date(),
        histories: historyForN8nUpdate(parsed.data)
      }
    });

    return NextResponse.json({ success: true, lead: formatLeadForApi(lead) });
  } catch (error) {
    console.error("ERRO API N8N AO ATUALIZAR LEAD:", { id, error });

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ success: false, error: "Lead não encontrado." }, { status: 404 });
    }

    return NextResponse.json(
      { success: false, error: "Não foi possível atualizar o lead." },
      { status: 500 }
    );
  }
}
