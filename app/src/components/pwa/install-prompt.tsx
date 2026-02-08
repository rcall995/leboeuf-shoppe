'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show if already installed or previously dismissed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem('pwa-install-dismissed')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShow(false);
    localStorage.setItem('pwa-install-dismissed', '1');
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg">
      <div className="flex items-center justify-between max-w-lg mx-auto gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Download className="h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">Install Le Boeuf Shoppe</p>
            <p className="text-xs text-muted-foreground">Quick access from your home screen</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={handleInstall}>Install</Button>
          <button onClick={handleDismiss} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
