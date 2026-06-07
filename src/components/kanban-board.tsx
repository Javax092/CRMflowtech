"use client";

import { LeadSource, OfferedService, PipelineStage, Segment } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { currency, date } from "@/lib/format";
import { pipelineStageLabels, segmentLabels, serviceLabels, sourceLabels } from "@/lib/labels";
import { inputClass } from "@/components/ui";

type KanbanLead = {
  id: string;
  companyName?: string | null;
  responsibleName?: string | null;
  pipelineStage: PipelineStage;
  segment: Segment;
  source: LeadSource;
  offeredService: OfferedService;
  city?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  proposedValue?: string | null;
  nextFollowUpAt?: string | Date | null;
};

const columns: PipelineStage[] = [
  "LEAD_ENCONTRADO",
  "DEMO_CRIADA",
  "MENSAGEM_ENVIADA",
  "RESPONDEU",
  "REUNIAO_MARCADA",
  "PROPOSTA_ENVIADA",
  "NEGOCIACAO",
  "FECHADO",
  "PERDIDO"
];

export function KanbanBoard({ leads }: { leads: KanbanLead[] }) {
  const router = useRouter();
  const [dragging, setDragging] = useState<string | null>(null);
  const [segment, setSegment] = useState("");
  const [source, setSource] = useState("");
  const [service, setService] = useState("");
  const [city, setCity] = useState("");

  const cities = Array.from(new Set(leads.map((lead) => lead.city).filter(Boolean))).sort() as string[];
  const filteredLeads = leads.filter((lead) => {
    return (
      (!segment || lead.segment === segment) &&
      (!source || lead.source === source) &&
      (!service || lead.offeredService === service) &&
      (!city || lead.city === city)
    );
  });

  async function moveLead(id: string, pipelineStage: PipelineStage) {
    await fetch(`/api/leads/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage })
    });
    setDragging(null);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
        <select className={inputClass} value={segment} onChange={(event) => setSegment(event.target.value)} aria-label="Filtrar por segmento">
          <option value="">Todos os segmentos</option>
          {Object.values(Segment).map((value) => <option key={value} value={value}>{segmentLabels[value]}</option>)}
        </select>
        <select className={inputClass} value={source} onChange={(event) => setSource(event.target.value)} aria-label="Filtrar por origem">
          <option value="">Todas as origens</option>
          {Object.values(LeadSource).map((value) => <option key={value} value={value}>{sourceLabels[value]}</option>)}
        </select>
        <select className={inputClass} value={service} onChange={(event) => setService(event.target.value)} aria-label="Filtrar por serviço">
          <option value="">Todos os serviços</option>
          {Object.values(OfferedService).map((value) => <option key={value} value={value}>{serviceLabels[value]}</option>)}
        </select>
        <select className={inputClass} value={city} onChange={(event) => setCity(event.target.value)} aria-label="Filtrar por cidade">
          <option value="">Todas as cidades</option>
          {cities.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>
      <div className="grid min-h-[620px] grid-cols-[repeat(9,minmax(260px,1fr))] gap-3 overflow-x-auto pb-4">
        {columns.map((stage) => {
          const columnLeads = filteredLeads.filter((lead) => lead.pipelineStage === stage);
          const total = columnLeads.reduce((sum, lead) => sum + Number(lead.proposedValue ?? 0), 0);
          return (
            <section
              key={stage}
              className="rounded-lg border border-slate-200 bg-slate-100"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dragging && moveLead(dragging, stage)}
            >
              <header className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-800">{pipelineStageLabels[stage]}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">{columnLeads.length}</span>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-500">{currency(String(total))}</p>
              </header>
              <div className="grid gap-2 p-2">
                {columnLeads.map((lead) => (
                  <article
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragging(lead.id)}
                    className="rounded-md border border-slate-200 bg-white p-3 shadow-sm hover:border-teal-300"
                  >
                    <a href={`/leads/${lead.id}`} className="text-sm font-semibold text-slate-950 hover:text-teal-700">
                      {lead.companyName ?? lead.responsibleName ?? "Lead sem nome"}
                    </a>
                    <div className="mt-2 grid gap-1 text-xs text-slate-500">
                      <span>{segmentLabels[lead.segment]}</span>
                      <span>{lead.whatsapp ?? (lead.instagram ? `@${lead.instagram}` : "Sem canal principal")}</span>
                      <span>{currency(lead.proposedValue)}</span>
                      <span>Follow-up: {date(lead.nextFollowUpAt)}</span>
                    </div>
                    <select
                      className={`${inputClass} mt-3 min-h-9 py-1 text-xs`}
                      value={lead.pipelineStage}
                      onChange={(event) => moveLead(lead.id, event.target.value as PipelineStage)}
                      aria-label="Alterar etapa"
                    >
                      {columns.map((value) => <option key={value} value={value}>{pipelineStageLabels[value]}</option>)}
                    </select>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
