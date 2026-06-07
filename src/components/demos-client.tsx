"use client";

import { Archive, Copy, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { archiveDemoSiteAction } from "@/app/actions";
import { DemoSiteForm } from "@/components/demo-site-form";
import { Badge, Button, Card, inputClass } from "@/components/ui";
import { date } from "@/lib/format";
import { demoSegments } from "@/lib/labels";

type DemoItem = {
  id: string;
  name: string;
  segment: string;
  url: string;
  reference: string | null;
  description: string | null;
  stack: string | null;
  status: string;
  notes: string | null;
  createdAt: Date | string;
};

export function DemosClient({ demos }: { demos: DemoItem[] }) {
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("");
  const [status, setStatus] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = demos.filter((demo) => {
    const haystack = `${demo.name} ${demo.url} ${demo.reference ?? ""}`.toLowerCase();
    return (
      (!query || haystack.includes(query.toLowerCase())) &&
      (!segment || demo.segment === segment) &&
      (!status || demo.status === status)
    );
  });

  const bySegment = useMemo(() => {
    return demos.reduce<Record<string, number>>((acc, demo) => {
      acc[demo.segment] = (acc[demo.segment] ?? 0) + 1;
      return acc;
    }, {});
  }, [demos]);

  return (
    <div className="grid gap-6">
      <Card className="p-5">
        <DemoSiteForm />
      </Card>
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr_180px_180px]">
        <input className={inputClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, URL ou referência" />
        <select className={inputClass} value={segment} onChange={(event) => setSegment(event.target.value)}>
          <option value="">Todos segmentos</option>
          {demoSegments.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos status</option>
          <option value="ACTIVE">Ativa</option>
          <option value="ARCHIVED">Arquivada</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge className="bg-slate-100 text-slate-700">Total: {demos.length}</Badge>
        {Object.entries(bySegment).map(([key, value]) => (
          <Badge key={key} className="bg-teal-50 text-teal-800">{key}: {value}</Badge>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((demo) => (
          <Card key={demo.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-950">{demo.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{demo.segment} · {demo.reference ?? "Sem referência"}</p>
              </div>
              <Badge className={demo.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}>
                {demo.status === "ACTIVE" ? "Ativa" : "Arquivada"}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-slate-600">{demo.description ?? "Sem descrição."}</p>
            <div className="mt-3 grid gap-1 text-sm text-slate-500">
              <span className="break-all">{demo.url}</span>
              <span>{demo.stack ?? "Stack não informada"} · Criada em {date(demo.createdAt)}</span>
            </div>
            {demo.notes ? <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{demo.notes}</p> : null}
            {editingId === demo.id ? (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <DemoSiteForm demo={demo} />
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={demo.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                <ExternalLink size={16} />
                Abrir
              </a>
              <Button variant="secondary" onClick={() => navigator.clipboard.writeText(demo.url)}>
                <Copy size={16} />
                Copiar URL
              </Button>
              <Button variant="secondary" onClick={() => setEditingId(editingId === demo.id ? null : demo.id)}>
                Editar
              </Button>
              {demo.status === "ACTIVE" ? (
                <form action={archiveDemoSiteAction.bind(null, demo.id)}>
                  <Button type="submit" variant="secondary">
                    <Archive size={16} />
                    Arquivar
                  </Button>
                </form>
              ) : null}
            </div>
          </Card>
        ))}
        {!filtered.length ? <p className="text-sm text-slate-500">Nenhuma demo encontrada.</p> : null}
      </div>
    </div>
  );
}
