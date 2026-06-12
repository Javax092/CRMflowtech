import { NextResponse } from "next/server";
import { validateAutomationSecret } from "@/lib/api-auth";
import { followUpSentAutomationSchema, markAutomationFollowUpSent } from "@/lib/follow-up-automation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = validateAutomationSecret(request);
  if (authError) return authError;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido." }, { status: 400 });
  }

  const parsed = followUpSentAutomationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  try {
    const result = await markAutomationFollowUpSent(id, parsed.data);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, lead: result.lead });
  } catch (error) {
    console.error("ERRO API AUTOMAÇÃO AO CONFIRMAR FOLLOW-UP:", { id, error });

    return NextResponse.json(
      { success: false, error: "Não foi possível confirmar o envio do follow-up." },
      { status: 500 }
    );
  }
}
