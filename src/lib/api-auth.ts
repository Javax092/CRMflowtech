import { NextResponse } from "next/server";

export function validateN8nApiKey(request: Request) {
  const configuredKey = process.env.N8N_API_KEY;

  if (!configuredKey && process.env.NODE_ENV !== "production") return null;

  const providedKey = request.headers.get("x-api-key");
  if (!configuredKey || providedKey !== configuredKey) {
    return NextResponse.json(
      { success: false, error: "API key ausente ou inválida." },
      { status: 401 }
    );
  }

  return null;
}

export function validateAutomationSecret(request: Request) {
  const configuredSecret = process.env.AUTOMATION_SECRET;
  const providedSecret = request.headers.get("x-automation-secret");

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return NextResponse.json(
      { success: false, error: "Automation secret ausente ou inválido." },
      { status: 401 }
    );
  }

  return null;
}
