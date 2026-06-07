import { ScriptsClient } from "@/components/scripts-client";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function ScriptsPage() {
  const scripts = await prisma.scriptTemplate.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="grid gap-6">
      <PageHeader title="Scripts comerciais" subtitle="Mensagens prontas com variáveis personalizadas por lead." />
      <ScriptsClient scripts={scripts.map(({ id, name, type, content }) => ({ id, name, type, content }))} />
    </div>
  );
}
