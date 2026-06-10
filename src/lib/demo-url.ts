import { PrismaClient } from "@prisma/client";

const DEMO_BASE_URL = "https://demos-flowtech.vercel.app/demo";

export function gerarSlug(companyName?: string | null) {
  const slug = (companyName || "lead")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "lead";
}

export function demoUrlFromSlug(demoSlug: string) {
  return `${DEMO_BASE_URL}/${demoSlug}`;
}

export async function uniqueDemoSlug(
  prisma: Pick<PrismaClient, "lead">,
  input: {
    leadId: string;
    companyName?: string | null;
    demoSlug?: string | null;
  }
) {
  const baseSlug = gerarSlug(input.demoSlug || input.companyName);
  const existing = await prisma.lead.findFirst({
    where: {
      demoSlug: baseSlug,
      NOT: { id: input.leadId }
    },
    select: { id: true }
  });

  if (!existing) return baseSlug;

  for (const suffixLength of [6, 8, 10, input.leadId.length]) {
    const candidate = `${baseSlug}-${input.leadId.slice(0, suffixLength)}`;
    const candidateExists = await prisma.lead.findFirst({
      where: {
        demoSlug: candidate,
        NOT: { id: input.leadId }
      },
      select: { id: true }
    });

    if (!candidateExists) return candidate;
  }

  return `${baseSlug}-${Date.now()}`;
}
