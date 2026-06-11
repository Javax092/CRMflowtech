"use client";

import { FollowUpSequenceStatus, LeadSource, LeadStatus, OfferedService, PipelineStage, Segment } from "@prisma/client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { createLeadAction, updateLeadAction } from "@/app/actions";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { dateTimeInput } from "@/lib/format";
import { followUpSequenceStatusLabels, pipelineStageLabels, segmentLabels, serviceLabels, sourceLabels, statusLabels } from "@/lib/labels";

type LeadFormProps = {
  lead?: {
    id: string;
    responsibleName?: string | null;
    companyName?: string | null;
    segment: Segment;
    instagram?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    city?: string | null;
    websiteUrl?: string | null;
    demoUrl?: string | null;
    demoSlug?: string | null;
    offeredService: OfferedService;
    proposedValue?: string | null;
    status: LeadStatus;
    pipelineStage?: PipelineStage | null;
    source: LeadSource;
    notes?: string | null;
    firstMessageSentAt?: Date | string | null;
    firstContactAt?: Date | string | null;
    lastContactAt?: Date | string | null;
    nextFollowUpAt?: Date | string | null;
    followUpCount?: number | null;
    followUpSequenceLength?: number | null;
    followUpSequenceStatus?: FollowUpSequenceStatus | null;
    lastFollowUpAt?: Date | string | null;
    nextAction?: string | null;
    followUpType?: string | null;
    nextStepNote?: string | null;
  };
};

export function LeadForm({ lead }: LeadFormProps) {
  const action = lead ? updateLeadAction.bind(null, lead.id) : createLeadAction;
  const [state, formAction, pending] = useActionState(action, {});
  const [forceDuplicate, setForceDuplicate] = useState(false);

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="forceDuplicate" value={forceDuplicate ? "true" : "false"} />
      {state.error ? (
        <Card className="border-rose-200 bg-rose-50 p-4">
          <p className="font-semibold text-rose-800">{state.error}</p>
          {state.duplicate ? (
            <div className="mt-3 grid gap-3 text-sm text-rose-900">
              <div className="rounded-md bg-white p-3">
                <div className="font-semibold">{state.duplicate.companyName ?? state.duplicate.responsibleName}</div>
                <div className="text-rose-700">
                  {state.duplicate.whatsapp ?? "Sem WhatsApp"} · {state.duplicate.instagram ?? "Sem Instagram"} · {state.duplicate.email ?? "Sem e-mail"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button href={`/leads/${state.duplicate.id}`} variant="secondary">Abrir cliente existente</Button>
                <Button href={`/leads/${state.duplicate.id}/edit`} variant="secondary">Atualizar existente</Button>
                <Button type="submit" variant="danger" onClick={() => setForceDuplicate(true)}>
                  Cadastrar mesmo assim
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Nome do responsável">
            <input className={inputClass} name="responsibleName" defaultValue={lead?.responsibleName ?? ""} />
          </Field>
          <Field label="Nome da empresa">
            <input className={inputClass} name="companyName" defaultValue={lead?.companyName ?? ""} />
          </Field>
          <Field label="Segmento" required>
            <select className={inputClass} name="segment" defaultValue={lead?.segment ?? Segment.OTHER}>
              {Object.values(Segment).map((value) => <option key={value} value={value}>{segmentLabels[value]}</option>)}
            </select>
          </Field>
          <Field label="Instagram">
            <input className={inputClass} name="instagram" placeholder="@empresa" defaultValue={lead?.instagram ?? ""} />
          </Field>
          <Field label="WhatsApp">
            <input className={inputClass} name="whatsapp" placeholder="5592999999999" defaultValue={lead?.whatsapp ?? ""} />
          </Field>
          <Field label="E-mail">
            <input className={inputClass} name="email" type="email" defaultValue={lead?.email ?? ""} />
          </Field>
          <Field label="Cidade">
            <input className={inputClass} name="city" defaultValue={lead?.city ?? ""} />
          </Field>
          <Field label="Site atual">
            <input className={inputClass} name="websiteUrl" type="url" defaultValue={lead?.websiteUrl ?? ""} />
          </Field>
          <Field label="Demonstração criada">
            <input className={inputClass} name="demoUrl" type="url" defaultValue={lead?.demoUrl ?? ""} />
          </Field>
          <Field label="Slug da demo">
            <input className={inputClass} name="demoSlug" defaultValue={lead?.demoSlug ?? ""} />
          </Field>
          <Field label="Serviço ofertado" required>
            <select className={inputClass} name="offeredService" defaultValue={lead?.offeredService ?? OfferedService.WEBSITE}>
              {Object.values(OfferedService).map((value) => <option key={value} value={value}>{serviceLabels[value]}</option>)}
            </select>
          </Field>
          <Field label="Valor proposto">
            <input className={inputClass} name="proposedValue" type="number" min="0" step="0.01" defaultValue={lead?.proposedValue?.toString() ?? ""} />
          </Field>
          <Field label="Status" required>
            <select className={inputClass} name="status" defaultValue={lead?.status ?? LeadStatus.NEW}>
              {Object.values(LeadStatus).map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}
            </select>
          </Field>
          <Field label="Etapa do pipeline">
            <select className={inputClass} name="pipelineStage" defaultValue={lead?.pipelineStage ?? PipelineStage.LEAD_ENCONTRADO}>
              {Object.values(PipelineStage).map((value) => <option key={value} value={value}>{pipelineStageLabels[value]}</option>)}
            </select>
          </Field>
          <Field label="Origem">
            <select className={inputClass} name="source" defaultValue={lead?.source ?? LeadSource.MANUAL_LIST}>
              {Object.values(LeadSource).map((value) => <option key={value} value={value}>{sourceLabels[value]}</option>)}
            </select>
          </Field>
          <Field label="Primeiro contato">
            <input className={inputClass} name="firstContactAt" type="date" defaultValue={dateTimeInput(lead?.firstContactAt)} />
          </Field>
          <Field label="Primeira mensagem enviada">
            <input className={inputClass} name="firstMessageSentAt" type="date" defaultValue={dateTimeInput(lead?.firstMessageSentAt)} />
          </Field>
          <Field label="Último contato">
            <input className={inputClass} name="lastContactAt" type="date" defaultValue={dateTimeInput(lead?.lastContactAt)} />
          </Field>
          <Field label="Último follow-up">
            <input className={inputClass} name="lastFollowUpAt" type="date" defaultValue={dateTimeInput(lead?.lastFollowUpAt)} />
          </Field>
          <Field label="Próximo follow-up">
            <input className={inputClass} name="nextFollowUpAt" type="date" defaultValue={dateTimeInput(lead?.nextFollowUpAt)} />
          </Field>
          <Field label="Follow-ups enviados">
            <input className={inputClass} name="followUpCount" type="number" min="0" max="3" defaultValue={lead?.followUpCount ?? 0} />
          </Field>
          <Field label="Tamanho da sequência">
            <select className={inputClass} name="followUpSequenceLength" defaultValue={lead?.followUpSequenceLength ?? 3}>
              <option value="2">2 follow-ups</option>
              <option value="3">3 follow-ups</option>
            </select>
          </Field>
          <Field label="Status da sequência">
            <select className={inputClass} name="followUpSequenceStatus" defaultValue={lead?.followUpSequenceStatus ?? FollowUpSequenceStatus.CANCELED}>
              {Object.values(FollowUpSequenceStatus).map((value) => <option key={value} value={value}>{followUpSequenceStatusLabels[value]}</option>)}
            </select>
          </Field>
          <Field label="Tipo de follow-up">
            <input className={inputClass} name="followUpType" placeholder="WhatsApp, ligação, proposta..." defaultValue={lead?.followUpType ?? ""} />
          </Field>
          <Field label="Próxima ação">
            <input className={inputClass} name="nextAction" defaultValue={lead?.nextAction ?? ""} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Observação do próximo passo">
              <input className={inputClass} name="nextStepNote" defaultValue={lead?.nextStepNote ?? ""} />
            </Field>
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <Field label="Observações comerciais">
              <textarea className={`${inputClass} min-h-28`} name="notes" defaultValue={lead?.notes ?? ""} />
            </Field>
          </div>
        </div>
      </Card>
      <div className="flex flex-wrap justify-end gap-3">
        <Button href={lead ? `/leads/${lead.id}` : "/leads"} variant="secondary">Cancelar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar lead"}</Button>
      </div>
      <p className="text-xs text-slate-500">
        Obrigatório: empresa ou responsável, segmento, status e pelo menos um canal de contato. WhatsApp, Instagram e e-mail são normalizados antes de salvar.
      </p>
      <Link href="/leads" className="sr-only">Voltar para leads</Link>
    </form>
  );
}
