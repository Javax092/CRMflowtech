import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateN8nApiKey } from "@/lib/api-auth";
import {
  defaultOfferedService,
  formatLeadForApi,
  leadSourceFromApi,
  leadStatusFromApi,
  n8nLeadCreateSchema,
  pipelineStageFromStatus,
  segmentFromApi
} from "@/lib/n8n-api";
import { demoUrlFromSlug, uniqueDemoSlug } from "@/lib/demo-url";
import { normalizeLeadInput } from "@/lib/normalizers";
import { prisma } from "@/lib/prisma";

const duplicateLookupSchema = z.object({
  instagram: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  email: z.string().nullable().optional()
});

function duplicateContactWhere(data: {
  instagramNormalized?: string | null;
  whatsappNormalized?: string | null;
  emailNormalized?: string | null;
}) {
  const conditions: Prisma.LeadWhereInput[] = [];
  if (data.instagramNormalized) conditions.push({ instagramNormalized: data.instagramNormalized });
  if (data.whatsappNormalized) conditions.push({ whatsappNormalized: data.whatsappNormalized });
  if (data.emailNormalized) conditions.push({ emailNormalized: data.emailNormalized });

  return conditions.length ? { OR: conditions } : null;
}

async function findDuplicateLead(data: {
  instagramNormalized?: string | null;
  whatsappNormalized?: string | null;
  emailNormalized?: string | null;
}) {
  const where = duplicateContactWhere(data);
  if (!where) return null;

  return prisma.lead.findFirst({ where });
}

function parseLimit(value: string | null) {
  if (!value) return 10;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 10;

  return Math.min(parsed, 100);
}

export async function GET(request: Request) {
  const authError = validateN8nApiKey(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const where: Prisma.LeadWhereInput = {};

  const statusParam = searchParams.get("status");
  if (statusParam) {
    try {
      where.status = leadStatusFromApi(statusParam);
    } catch (error) {
      return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Status inválido." }, { status: 400 });
    }
  }

  if (searchParams.get("withoutAudit") === "true") {
    where.OR = [{ audit: null }, { audit: "" }];
  }

  try {
    const leads = await prisma.lead.findMany({
      where,
      take: parseLimit(searchParams.get("limit")),
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json({ success: true, leads: leads.map(formatLeadForApi) });
  } catch (error) {
    console.error("ERRO API N8N AO BUSCAR LEADS:", error);

    return NextResponse.json(
      { success: false, error: "Não foi possível buscar os leads." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authError = validateN8nApiKey(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido." }, { status: 400 });
  }

  const lookup = duplicateLookupSchema.safeParse(body);
  if (lookup.success) {
    const duplicate = await findDuplicateLead(normalizeLeadInput(lookup.data));
    if (duplicate) {
      return NextResponse.json({
        success: true,
        duplicated: true,
        lead: formatLeadForApi(duplicate)
      });
    }
  }

  const parsed = n8nLeadCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  let status;
  try {
    status = leadStatusFromApi(parsed.data.status);
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Status inválido." }, { status: 400 });
  }

  const data = normalizeLeadInput({
    companyName: parsed.data.name,
    segment: segmentFromApi(parsed.data.segment),
    instagram: parsed.data.instagram,
    whatsapp: parsed.data.whatsapp,
    email: parsed.data.email,
    city: parsed.data.city,
    notes: parsed.data.notes,
    status,
    pipelineStage: pipelineStageFromStatus(status),
    source: leadSourceFromApi(parsed.data),
    offeredService: defaultOfferedService
  });

  try {
    const duplicate = await findDuplicateLead(data);
    if (duplicate) {
      return NextResponse.json({
        success: true,
        duplicated: true,
        lead: formatLeadForApi(duplicate)
      });
    }

    const lead = await prisma.lead.create({ data });
    const shouldSaveDemo = parsed.data.demoSlug !== undefined || parsed.data.demoUrl !== undefined;
    const savedLead = shouldSaveDemo
      ? await prisma.lead.update({
          where: { id: lead.id },
          data: {
            demoSlug: await uniqueDemoSlug(prisma, {
              leadId: lead.id,
              companyName: lead.companyName,
              demoSlug: parsed.data.demoSlug
            })
          }
        })
      : lead;
    const leadWithDemoUrl = shouldSaveDemo && savedLead.demoSlug
      ? await prisma.lead.update({
          where: { id: savedLead.id },
          data: { demoUrl: demoUrlFromSlug(savedLead.demoSlug) }
        })
      : savedLead;
    return NextResponse.json({ success: true, lead: formatLeadForApi(leadWithDemoUrl) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await findDuplicateLead(data);
      if (duplicate) {
        return NextResponse.json({
          success: true,
          duplicated: true,
          lead: formatLeadForApi(duplicate)
        });
      }
    }

    console.error("ERRO API N8N AO CADASTRAR LEAD:", error);

    return NextResponse.json(
      { success: false, error: "Não foi possível cadastrar o lead." },
      { status: 500 }
    );
  }
}
