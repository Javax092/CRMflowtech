import { NextResponse } from "next/server";
import { getLeadDemoStatus } from "@/lib/demo-status";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    return NextResponse.json(await getLeadDemoStatus(prisma));
  } catch (error) {
    console.error("ERRO AO BUSCAR STATUS DAS DEMOS:", error);

    return NextResponse.json(
      { error: "Não foi possível buscar o status das demos." },
      { status: 500 }
    );
  }
}
