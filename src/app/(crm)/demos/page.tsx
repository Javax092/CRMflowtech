import { DemosClient } from "@/components/demos-client";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function DemosPage() {
  const demos = await prisma.demoSite.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="grid gap-6">
      <PageHeader title="Biblioteca de demos" subtitle="Reaproveite sites demonstrativos e vincule rapidamente aos leads." />
      <DemosClient demos={demos} />
    </div>
  );
}
