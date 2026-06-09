import { NextResponse } from "next/server";
import { validateN8nApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authError = validateN8nApiKey(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const segment = searchParams.get("segment")?.trim();

  const demos = await prisma.demoSite.findMany({
    where: {
      status: "ACTIVE",
      ...(segment ? { segment: { equals: segment, mode: "insensitive" } } : {})
    },
    select: {
      id: true,
      name: true,
      segment: true,
      url: true,
      reference: true,
      stack: true,
      status: true,
      description: true,
      createdAt: true
    },
    orderBy: [{ segment: "asc" }, { name: "asc" }]
  });

  return NextResponse.json({
    success: true,
    demos: demos.map((demo) => ({ ...demo, createdAt: demo.createdAt.toISOString() }))
  });
}
