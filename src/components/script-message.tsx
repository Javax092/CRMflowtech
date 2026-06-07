"use client";

import { ScriptType } from "@prisma/client";
import { Copy, Save } from "lucide-react";
import { useActionState } from "react";
import { useMemo, useState } from "react";
import { saveGeneratedMessageAction } from "@/app/actions";
import { Button, Field, inputClass } from "@/components/ui";
import { scriptLabels } from "@/lib/labels";

type SimpleScript = {
  id: string;
  name: string;
  type: ScriptType;
  content: string;
};

type LeadData = {
  responsibleName?: string | null;
  companyName?: string | null;
  segment: string;
  demoUrl?: string | null;
  offeredService: string;
};

const defaultScripts: SimpleScript[] = [
  {
    id: "default-first",
    name: "Primeira abordagem com site demo",
    type: ScriptType.FIRST_APPROACH,
    content:
      "Olá, {{nome}}.\n\nVi o perfil da {{empresa}} e percebi uma oportunidade de melhorar a forma como {{publico}} chegam até vocês.\n\n{{blocoDemo}}\nA ideia é facilitar o contato pelo WhatsApp, aumentar a confiança de quem visita e transformar mais interessados em clientes.\n\nPosso te mostrar rapidamente como funcionaria?"
  },
  {
    id: "default-follow-up",
    name: "Follow-up educado",
    type: ScriptType.FOLLOW_UP_1,
    content:
      "Olá, {{nome}}.\n\nPassando para saber se você conseguiu ver a ideia para a {{empresa}}. Pensei em algo simples, direto e focado em facilitar {{objetivo}}.\n\n{{blocoDemo}}\nFaz sentido eu te explicar em poucos minutos?"
  },
  {
    id: "default-urgency",
    name: "Follow-up com urgência leve",
    type: ScriptType.FOLLOW_UP_2,
    content:
      "Olá, {{nome}}.\n\nEstou organizando as próximas demos da semana e quis te chamar antes de seguir com outros segmentos. A {{empresa}} tem um bom potencial para melhorar {{objetivo}} com uma presença digital mais clara.\n\n{{blocoDemo}}\nQuer que eu te mostre o caminho mais simples?"
  },
  {
    id: "default-website",
    name: "Proposta de site profissional",
    type: ScriptType.WEBSITE_PROPOSAL,
    content:
      "Olá, {{nome}}.\n\nMinha proposta para a {{empresa}} é um site profissional, rápido e pensado para gerar confiança, organizar informações importantes e levar {{publico}} direto para o WhatsApp.\n\n{{blocoDemo}}\nPosso te passar uma proposta objetiva para colocarmos isso no ar?"
  },
  {
    id: "default-system",
    name: "Proposta de sistema/automação",
    type: ScriptType.SYSTEM_PROPOSAL,
    content:
      "Olá, {{nome}}.\n\nAlém do site, vejo espaço para a {{empresa}} automatizar partes do atendimento e reduzir trabalho manual. A ideia é deixar {{objetivo}} mais organizado e fácil de acompanhar.\n\nSe fizer sentido, posso mapear um fluxo simples e te mostrar uma primeira versão."
  }
];

function segmentContext(segment: string) {
  const normalized = segment.toLowerCase();
  if (normalized.includes("advoc")) return { publico: "clientes", objetivo: "atendimentos e autoridade" };
  if (normalized.includes("nutri")) return { publico: "pacientes", objetivo: "consultas e agendamentos" };
  if (normalized.includes("veter") || normalized.includes("pet")) return { publico: "tutores e pets", objetivo: "agendamentos e atendimento" };
  if (normalized.includes("restaurante")) return { publico: "clientes", objetivo: "pedidos, cardápio e WhatsApp" };
  return { publico: "clientes", objetivo: "clientes e atendimento" };
}

export function ScriptMessage({ leadId, scripts, lead }: { leadId: string; scripts: SimpleScript[]; lead: LeadData }) {
  const availableScripts = scripts.length ? scripts : defaultScripts;
  const [scriptId, setScriptId] = useState(availableScripts[0]?.id ?? "");
  const [state, action, pending] = useActionState(saveGeneratedMessageAction.bind(null, leadId), {});
  const script = availableScripts.find((item) => item.id === scriptId);
  const message = useMemo(() => {
    const content = script?.content ?? "";
    const greetingName = lead.responsibleName?.trim() || "tudo bem?";
    const { publico, objetivo } = segmentContext(lead.segment);
    const blocoDemo = lead.demoUrl
      ? `Preparei uma demonstração simples para mostrar como poderia ficar uma presença digital mais profissional:\n\n${lead.demoUrl}\n\n`
      : "";

    return content
      .replaceAll("{{nome}}", greetingName)
      .replaceAll("{{empresa}}", lead.companyName ?? "sua empresa")
      .replaceAll("{{segmento}}", lead.segment)
      .replaceAll("{{linkDemo}}", lead.demoUrl ?? "")
      .replaceAll("{{demo}}", lead.demoUrl ?? "")
      .replaceAll("{{blocoDemo}}", blocoDemo)
      .replaceAll("{{publico}}", publico)
      .replaceAll("{{objetivo}}", objetivo)
      .replaceAll("{{servico}}", lead.offeredService)
      .replaceAll("Olá, tudo bem?.", "Olá, tudo bem?");
  }, [script, lead]);

  return (
    <div className="grid gap-3">
      <Field label="Script">
        <select className={inputClass} value={scriptId} onChange={(event) => setScriptId(event.target.value)}>
          {availableScripts.map((item) => <option key={item.id} value={item.id}>{item.name} · {scriptLabels[item.type]}</option>)}
        </select>
      </Field>
      <textarea className={`${inputClass} min-h-40`} readOnly value={message} />
      <form action={action} className="grid gap-3">
        <input type="hidden" name="type" value={script?.name ?? "Mensagem gerada"} />
        <input type="hidden" name="message" value={message} />
        {state.error ? <p className="text-sm text-rose-700">{state.error}</p> : null}
        {state.ok ? <p className="text-sm text-teal-700">Mensagem salva no histórico.</p> : null}
        <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => navigator.clipboard.writeText(message)}>
          <Copy size={16} />
          Copiar mensagem
        </Button>
          <Button type="submit" disabled={pending}>
            <Save size={16} />
            {pending ? "Salvando..." : "Salvar no histórico"}
          </Button>
        </div>
      </form>
    </div>
  );
}
