"use client";

import { DemoSite } from "@prisma/client";
import { useActionState } from "react";
import { createDemoSiteAction, updateDemoSiteAction } from "@/app/actions";
import { Button, Field, inputClass } from "@/components/ui";
import { demoSegments } from "@/lib/labels";

type DemoFormData = Pick<DemoSite, "id" | "name" | "segment" | "url" | "reference" | "description" | "stack" | "status" | "notes">;

export function DemoSiteForm({ demo }: { demo?: DemoFormData }) {
  const action = demo ? updateDemoSiteAction.bind(null, demo.id) : createDemoSiteAction;
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nome da demo" required>
          <input className={inputClass} name="name" defaultValue={demo?.name ?? ""} />
        </Field>
        <Field label="Segmento" required>
          <select className={inputClass} name="segment" defaultValue={demo?.segment ?? "Outro"}>
            {demoSegments.map((segment) => <option key={segment} value={segment}>{segment}</option>)}
          </select>
        </Field>
        <Field label="URL da demo" required>
          <input className={inputClass} name="url" type="url" defaultValue={demo?.url ?? ""} />
        </Field>
        <Field label="Referência">
          <input className={inputClass} name="reference" defaultValue={demo?.reference ?? ""} />
        </Field>
        <Field label="Stack usada">
          <input className={inputClass} name="stack" placeholder="Next.js, WordPress, HTML..." defaultValue={demo?.stack ?? ""} />
        </Field>
        <Field label="Status">
          <select className={inputClass} name="status" defaultValue={demo?.status ?? "ACTIVE"}>
            <option value="ACTIVE">Ativa</option>
            <option value="ARCHIVED">Arquivada</option>
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Descrição curta">
            <input className={inputClass} name="description" defaultValue={demo?.description ?? ""} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Observações">
            <textarea className={`${inputClass} min-h-24`} name="notes" defaultValue={demo?.notes ?? ""} />
          </Field>
        </div>
      </div>
      {state.error ? <p className="text-sm text-rose-700">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-teal-700">Demo salva.</p> : null}
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Salvando..." : demo ? "Salvar alterações" : "Cadastrar demo"}</Button>
      </div>
    </form>
  );
}
