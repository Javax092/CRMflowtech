import { BarChart3, CalendarCheck2, CalendarClock, KanbanSquare, LayoutDashboard, Library, LogOut, MessageSquareText, PlusCircle, Settings, Users } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { PwaInstall } from "@/components/pwa-install";
import { requireAuth } from "@/lib/auth";

const items = [
  { href: "/hoje", label: "Hoje", icon: CalendarCheck2 },
  { href: "/leads/new", label: "Novo lead", icon: PlusCircle },
  { href: "/kanban", label: "Pipeline", icon: KanbanSquare },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/follow-ups", label: "Follow-ups", icon: CalendarClock },
  { href: "/demos", label: "Demos", icon: Library },
  { href: "/scripts", label: "Scripts", icon: MessageSquareText },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/settings", label: "Configurações", icon: Settings }
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  await requireAuth();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-slate-200 bg-slate-950 text-white lg:min-h-screen lg:border-b-0">
        <div className="flex items-center justify-between px-5 py-4 lg:block">
          <Link href="/hoje" className="block">
            <div className="text-xl font-bold">FlowCRM</div>
            <div className="text-xs text-slate-300">FlowtechAM Comercial</div>
          </Link>
          <form action={logoutAction} className="lg:hidden">
            <button className="rounded-md p-2 text-slate-300 hover:bg-white/10" title="Sair">
              <LogOut size={18} />
            </button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:grid lg:px-3 lg:py-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-w-max items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10"
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-3 lg:pb-0">
          <PwaInstall />
        </div>
        <form action={logoutAction} className="hidden px-3 lg:block">
          <button className="mt-4 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10">
            <LogOut size={18} />
            Sair
          </button>
        </form>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
