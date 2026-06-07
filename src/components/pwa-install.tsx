"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Falha ao registrar service worker:", error);
      });
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));
    setIsStandalone(standalone);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setCanInstall(false);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isStandalone) return null;

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome !== "dismissed") {
      setInstallPrompt(null);
      setCanInstall(false);
    }
  }

  if (canInstall) {
    return (
      <Button type="button" variant="secondary" onClick={installApp} className="w-full justify-start border-slate-700 bg-slate-900 text-white hover:bg-slate-800 lg:border-white/10">
        <Download size={16} />
        Instalar FlowCRM no computador
      </Button>
    );
  }

  return (
    <p className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs leading-5 text-slate-300 lg:border-white/10">
      No Chrome, clique no ícone de instalar na barra de endereço.
    </p>
  );
}
