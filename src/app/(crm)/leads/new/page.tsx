import { LeadForm } from "@/components/lead-form";
import { PageHeader } from "@/components/ui";

export default function NewLeadPage() {
  return (
    <div className="grid gap-6">
      <PageHeader title="Novo lead" subtitle="Cadastre com prevenção obrigatória de duplicidade." />
      <LeadForm />
    </div>
  );
}
