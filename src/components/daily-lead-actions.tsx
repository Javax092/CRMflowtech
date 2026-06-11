"use client";

import { CalendarPlus, CheckCheck, MessageSquareText, Pause, Reply, SquareX, ThumbsDown } from "lucide-react";
import { useActionState } from "react";
import {
  cancelLeadFollowUpSequenceFormAction,
  markLeadFollowUpSentFormAction,
  markLeadLostFormAction,
  markLeadMessageSentFormAction,
  moveLeadToRespondedFormAction,
  pauseLeadFollowUpSequenceFormAction,
  scheduleLeadFollowUpAction
} from "@/app/actions";
import { Button, inputClass } from "@/components/ui";

type DailyLeadActionsProps = {
  leadId: string;
};

export function DailyLeadActions({ leadId }: DailyLeadActionsProps) {
  const [messageState, messageAction, messagePending] = useActionState(markLeadMessageSentFormAction.bind(null, leadId), {});
  const [followUpState, followUpAction, followUpPending] = useActionState(markLeadFollowUpSentFormAction.bind(null, leadId), {});
  const [pauseState, pauseAction, pausePending] = useActionState(pauseLeadFollowUpSequenceFormAction.bind(null, leadId), {});
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelLeadFollowUpSequenceFormAction.bind(null, leadId), {});
  const [respondedState, respondedAction, respondedPending] = useActionState(moveLeadToRespondedFormAction.bind(null, leadId), {});
  const [lostState, lostAction, lostPending] = useActionState(markLeadLostFormAction.bind(null, leadId), {});
  const [scheduleState, scheduleAction, schedulePending] = useActionState(scheduleLeadFollowUpAction.bind(null, leadId), {});

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Button href={`/leads/${leadId}`} variant="secondary">Abrir lead</Button>
        <Button href={`/leads/${leadId}#abordagem`} variant="ghost">
          <MessageSquareText size={16} />
          Gerar abordagem
        </Button>
        <form action={messageAction}>
          <Button type="submit" variant="secondary" disabled={messagePending}>
            <CheckCheck size={16} />
            {messagePending ? "Marcando..." : "Marcar mensagem enviada"}
          </Button>
        </form>
        <form action={followUpAction}>
          <Button type="submit" variant="secondary" disabled={followUpPending}>
            <CheckCheck size={16} />
            {followUpPending ? "Marcando..." : "Marcar follow-up enviado"}
          </Button>
        </form>
        <form action={pauseAction}>
          <Button type="submit" variant="ghost" disabled={pausePending}>
            <Pause size={16} />
            {pausePending ? "Pausando..." : "Pausar sequência"}
          </Button>
        </form>
        <form action={cancelAction}>
          <Button type="submit" variant="ghost" disabled={cancelPending}>
            <SquareX size={16} />
            {cancelPending ? "Cancelando..." : "Cancelar sequência"}
          </Button>
        </form>
        <form action={respondedAction}>
          <Button type="submit" variant="secondary" disabled={respondedPending}>
            <Reply size={16} />
            {respondedPending ? "Movendo..." : "Mover para respondeu"}
          </Button>
        </form>
        <form action={lostAction}>
          <Button type="submit" variant="danger" disabled={lostPending}>
            <ThumbsDown size={16} />
            {lostPending ? "Marcando..." : "Marcar como perdido"}
          </Button>
        </form>
      </div>
      {messageState.error ? <p className="text-sm text-rose-700">{messageState.error}</p> : null}
      {messageState.ok ? <p className="text-sm text-teal-700">Mensagem marcada como enviada.</p> : null}
      {followUpState.error ? <p className="text-sm text-rose-700">{followUpState.error}</p> : null}
      {followUpState.ok ? <p className="text-sm text-teal-700">Follow-up marcado como enviado.</p> : null}
      {pauseState.error ? <p className="text-sm text-rose-700">{pauseState.error}</p> : null}
      {cancelState.error ? <p className="text-sm text-rose-700">{cancelState.error}</p> : null}
      {respondedState.error ? <p className="text-sm text-rose-700">{respondedState.error}</p> : null}
      {lostState.error ? <p className="text-sm text-rose-700">{lostState.error}</p> : null}
      <form action={scheduleAction} className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-[160px_150px_1fr_auto]">
        <input className={inputClass} type="date" name="nextFollowUpAt" aria-label="Data do follow-up" required />
        <input className={inputClass} name="followUpType" placeholder="Tipo" defaultValue="Follow-up" />
        <input className={inputClass} name="nextStepNote" placeholder="Próxima ação" />
        <Button type="submit" disabled={schedulePending}>
          <CalendarPlus size={16} />
          {schedulePending ? "Agendando..." : "Agendar follow-up"}
        </Button>
        {scheduleState.error ? <p className="text-sm text-rose-700 md:col-span-4">{scheduleState.error}</p> : null}
        {scheduleState.ok ? <p className="text-sm text-teal-700 md:col-span-4">Follow-up agendado.</p> : null}
      </form>
    </div>
  );
}
