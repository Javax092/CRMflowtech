"use client";

import { ContactEventType } from "@prisma/client";
import { useActionState } from "react";
import { addHistoryAction } from "@/app/actions";
import { Button, Field, inputClass } from "@/components/ui";
import { eventLabels } from "@/lib/labels";

export function HistoryForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(addHistoryAction.bind(null, leadId), {});
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo de evento">
          <select className={inputClass} name="type" defaultValue={ContactEventType.FOLLOW_UP}>
            {Object.values(ContactEventType).map((value) => <option key={value} value={value}>{eventLabels[value]}</option>)}
          </select>
        </Field>
        <Field label="Título">
          <input className={inputClass} name="title" placeholder="Ex: follow-up enviado" />
        </Field>
      </div>
      <Field label="Mensagem ou observação">
        <textarea className={`${inputClass} min-h-24`} name="message" />
      </Field>
      {state.error ? <p className="text-sm text-rose-700">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-teal-700">Evento adicionado.</p> : null}
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Adicionando..." : "Adicionar evento"}</Button>
      </div>
    </form>
  );
}
