import { NextResponse } from "next/server";
import { validateAutomationSecret } from "@/lib/api-auth";
import { automationLimitFromSearch, getDueFollowUpsForAutomation } from "@/lib/follow-up-automation";

export async function GET(request: Request) {
  const authError = validateAutomationSecret(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const limit = automationLimitFromSearch(searchParams);

  try {
    const followUps = await getDueFollowUpsForAutomation(limit);

    return NextResponse.json(followUps);
  } catch (error) {
    console.error("ERRO API AUTOMAÇÃO AO BUSCAR FOLLOW-UPS:", error);

    return NextResponse.json(
      { success: false, error: "Não foi possível buscar follow-ups vencidos." },
      { status: 500 }
    );
  }
}
