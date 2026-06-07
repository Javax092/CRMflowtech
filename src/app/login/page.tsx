"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";
import { Button, Card, Field, inputClass } from "@/components/ui";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, {});

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-950">FlowCRM</h1>
          <p className="mt-2 text-sm text-slate-500">Acesse o painel comercial da FlowtechAM.</p>
        </div>
        <form action={action} className="grid gap-4">
          <Field label="E-mail">
            <input className={inputClass} name="email" type="email" defaultValue="admin@flowtecham.com" />
          </Field>
          <Field label="Senha">
            <input className={inputClass} name="password" type="password" placeholder="Senha administrativa" />
          </Field>
          {state.error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
