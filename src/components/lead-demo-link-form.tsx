"use client";

import { Link2 } from "lucide-react";
import { useActionState } from "react";
import { linkDemoToLeadAction } from "@/app/actions";
import { Button, Field, inputClass } from "@/components/ui";

type DemoOption = {
  id: string;
  name: string;
  url: string;
  segment: string;
};

export function LeadDemoLinkForm({
  leadId,
  demos,
  currentDemoSiteId
}: {
  leadId: string;
  demos: DemoOption[];
  currentDemoSiteId?: string | null;
}) {
  const [state, action, pending] = useActionState(linkDemoToLeadAction.bind(null, leadId), {});

  if (!demos.length) return <p className="text-sm text-slate-500">Nenhuma demo ativa cadastrada.</p>;

  return (
    <form action={action} className="grid gap-3">
      <Field label="Demo existente">
        <select className={inputClass} name="demoSiteId" defaultValue={currentDemoSiteId ?? ""}>
          <option value="">Selecione uma demo</option>
          {demos.map((demo) => (
            <option key={demo.id} value={demo.id}>
              {demo.name} · {demo.segment}
            </option>
          ))}
        </select>
      </Field>
      {state.error ? <p className="text-sm text-rose-700">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-teal-700">Demo vinculada ao lead.</p> : null}
      <div>
        <Button type="submit" disabled={pending}>
          <Link2 size={16} />
          {pending ? "Vinculando..." : "Vincular demo"}
        </Button>
      </div>
    </form>
  );
}
