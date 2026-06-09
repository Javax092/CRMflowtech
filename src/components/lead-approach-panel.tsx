"use client";

import { Copy, Save } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { saveLeadApproachAction } from "@/app/actions";
import { Button, Field, inputClass } from "@/components/ui";
import { splitLeadApproachSections } from "@/lib/approach";

type LeadApproachPanelProps = {
  leadId: string;
  initialRecommendedProduct: string;
  initialAudit: string;
  initialDemoUrl: string;
  initialApproachScript: string;
};

function copyText(value: string) {
  if (!value.trim()) return;
  void navigator.clipboard.writeText(value);
}

export function LeadApproachPanel({
  leadId,
  initialRecommendedProduct,
  initialAudit,
  initialDemoUrl,
  initialApproachScript
}: LeadApproachPanelProps) {
  const [state, action, pending] = useActionState(saveLeadApproachAction.bind(null, leadId), {});
  const [approachScript, setApproachScript] = useState(initialApproachScript);
  const sections = useMemo(() => splitLeadApproachSections(approachScript), [approachScript]);

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Produto recomendado">
          <input className={inputClass} name="recommendedProduct" defaultValue={initialRecommendedProduct} />
        </Field>
        <Field label="Link da demonstração">
          <input className={inputClass} name="demoUrl" type="url" defaultValue={initialDemoUrl} />
        </Field>
      </div>

      <Field label="Auditoria">
        <textarea className={`${inputClass} min-h-28`} name="audit" defaultValue={initialAudit} />
      </Field>

      <div className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => copyText(sections.whatsapp || approachScript)}>
            <Copy size={16} />
            Copiar WhatsApp
          </Button>
          <Button variant="secondary" onClick={() => copyText(sections.followUp1 || sections.followUp2)}>
            <Copy size={16} />
            Copiar follow-up
          </Button>
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase text-slate-500">Mensagem curta para WhatsApp</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{sections.whatsapp || "Edite a abordagem abaixo para manter este bloco."}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase text-slate-500">Follow-up 1</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{sections.followUp1 || "-"}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase text-slate-500">Follow-up 2</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{sections.followUp2 || "-"}</p>
          </div>
        </div>
      </div>

      <Field label="Abordagem pronta">
        <textarea
          className={`${inputClass} min-h-96 font-mono leading-relaxed`}
          name="approachScript"
          value={approachScript}
          onChange={(event) => setApproachScript(event.target.value)}
        />
      </Field>

      {state.error ? <p className="text-sm text-rose-700">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-teal-700">Abordagem salva no CRM.</p> : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="submit" disabled={pending}>
          <Save size={16} />
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
