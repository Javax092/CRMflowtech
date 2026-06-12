import { NextResponse } from "next/server";
import { validateAutomationSecret } from "@/lib/api-auth";
import { followUpFailedAutomationSchema, markAutomationFollowUpFailed } from "@/lib/follow-up-automation";

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

  const parsed = followUpFailedAutomationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  try {
    await markAutomationFollowUpFailed(id, parsed.data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERRO API AUTOMAÇÃO AO REGISTRAR FALHA DE FOLLOW-UP:", { id, error });

    return NextResponse.json(
      { success: false, error: "Não foi possível registrar a falha de envio." },
      { status: 500 }
    );
  }
}
