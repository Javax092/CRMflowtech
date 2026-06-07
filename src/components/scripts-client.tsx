"use client";

import { ScriptType } from "@prisma/client";
import { useActionState, useState } from "react";
import { createScriptAction, updateScriptAction } from "@/app/actions";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { scriptLabels } from "@/lib/labels";

type SimpleScript = {
  id: string;
  name: string;
  type: ScriptType;
  content: string;
};

export function ScriptsClient({ scripts }: { scripts: SimpleScript[] }) {
  const [state, action, pending] = useActionState(createScriptAction, {});
  const [editingId, setEditingId] = useState<string | null>(null);
  return (
    <div className="grid gap-6">
      <Card className="p-5">
        <form action={action} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome">
              <input className={inputClass} name="name" />
            </Field>
            <Field label="Tipo">
              <select className={inputClass} name="type">
                {Object.values(ScriptType).map((type) => <option key={type} value={type}>{scriptLabels[type]}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Conteúdo">
            <textarea className={`${inputClass} min-h-36`} name="content" placeholder="Use {{nome}}, {{empresa}}, {{segmento}}, {{linkDemo}} e {{servico}}." />
          </Field>
          <p className="text-xs text-slate-500">Variáveis disponíveis: {"{{nome}}"}, {"{{empresa}}"}, {"{{segmento}}"}, {"{{linkDemo}}"}, {"{{servico}}"}.</p>
          <input type="hidden" name="active" value="true" />
          {state.error ? <p className="text-sm text-rose-700">{state.error}</p> : null}
          {state.ok ? <p className="text-sm text-teal-700">Script salvo.</p> : null}
          <div>
            <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar script"}</Button>
          </div>
        </form>
      </Card>
      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Scripts cadastrados</h2>
        <div className="grid gap-3">
          {scripts.map((script) => (
            <div key={script.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{script.name}</strong>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{scriptLabels[script.type]}</span>
                  <Button variant="secondary" onClick={() => setEditingId(editingId === script.id ? null : script.id)}>Editar</Button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{script.content}</p>
              {editingId === script.id ? <ScriptEditForm script={script} /> : null}
            </div>
          ))}
          {!scripts.length ? <p className="text-sm text-slate-500">Nenhum script cadastrado.</p> : null}
        </div>
      </Card>
    </div>
  );
}

function ScriptEditForm({ script }: { script: SimpleScript }) {
  const [state, action, pending] = useActionState(updateScriptAction.bind(null, script.id), {});

  return (
    <form action={action} className="mt-4 grid gap-3 border-t border-slate-200 pt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome">
          <input className={inputClass} name="name" defaultValue={script.name} />
        </Field>
        <Field label="Tipo">
          <select className={inputClass} name="type" defaultValue={script.type}>
            {Object.values(ScriptType).map((type) => <option key={type} value={type}>{scriptLabels[type]}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Conteúdo">
        <textarea className={`${inputClass} min-h-36`} name="content" defaultValue={script.content} />
      </Field>
      <input type="hidden" name="active" value="true" />
      {state.error ? <p className="text-sm text-rose-700">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-teal-700">Script atualizado.</p> : null}
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar alterações"}</Button>
      </div>
    </form>
  );
}
