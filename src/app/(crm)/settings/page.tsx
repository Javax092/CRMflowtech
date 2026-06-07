import { Card, PageHeader } from "@/components/ui";

export default function SettingsPage() {
  return (
    <div className="grid gap-6">
      <PageHeader title="Configurações" subtitle="Parâmetros operacionais do FlowCRM." />
      <Card className="p-5">
        <div className="grid gap-4 text-sm text-slate-700">
          <div>
            <h2 className="font-semibold text-slate-950">Login administrativo</h2>
            <p className="mt-1">Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `AUTH_SECRET` no arquivo `.env`.</p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-950">Anti-duplicidade</h2>
            <p className="mt-1">WhatsApp, Instagram e e-mail normalizados têm índices únicos no PostgreSQL. Nome da empresa normalizado entra na checagem de possível duplicidade antes de salvar.</p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-950">Variáveis de scripts</h2>
            <p className="mt-1">
              Use <code>{"{{nome}}"}</code>, <code>{"{{empresa}}"}</code>, <code>{"{{segmento}}"}</code>, <code>{"{{demo}}"}</code> e <code>{"{{servico}}"}</code> nos modelos de mensagem.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
