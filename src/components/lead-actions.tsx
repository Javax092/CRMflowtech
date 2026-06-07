"use client";

import { LeadStatus } from "@prisma/client";
import { Copy, Instagram, MessageCircle } from "lucide-react";
import { updateLeadStatusAction } from "@/app/actions";
import { Button } from "@/components/ui";

type LeadActionProps = {
  id: string;
  whatsapp?: string | null;
  instagram?: string | null;
  responsibleName?: string | null;
  companyName?: string | null;
};

export function LeadQuickActions({ id, whatsapp, instagram, responsibleName, companyName }: LeadActionProps) {
  const message = `Olá, ${responsibleName ?? "tudo bem"}? Sou da FlowtechAM. Vi a ${companyName ?? "sua empresa"} e preparei uma ideia para melhorar sua presença digital. Posso te enviar?`;

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => updateLeadStatusAction(id, LeadStatus.CONTACTED)}>Abordado</Button>
      <Button variant="secondary" onClick={() => updateLeadStatusAction(id, LeadStatus.INTERESTED)}>Interessado</Button>
      <Button variant="secondary" onClick={() => updateLeadStatusAction(id, LeadStatus.WON)}>Fechado</Button>
      <Button variant="secondary" onClick={() => updateLeadStatusAction(id, LeadStatus.LOST)}>Perdido</Button>
      <Button variant="ghost" onClick={() => navigator.clipboard.writeText(message)} title="Copiar mensagem">
        <Copy size={16} />
      </Button>
      {whatsapp ? (
        <Button href={`https://wa.me/${whatsapp}`} variant="ghost" title="Abrir WhatsApp">
          <MessageCircle size={16} />
        </Button>
      ) : null}
      {instagram ? (
        <Button href={`https://instagram.com/${instagram}`} variant="ghost" title="Abrir Instagram">
          <Instagram size={16} />
        </Button>
      ) : null}
    </div>
  );
}
