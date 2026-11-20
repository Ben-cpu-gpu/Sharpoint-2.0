import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        aria-label="Installer FicheMaster IA en application"
        title="Installer l'application (PWA)"
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#0A0E19] hover:bg-[#101625] border border-sky-400/35 text-xs font-semibold text-sky-300 transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5 text-sky-400" />
        <span className="hidden 2xl:inline">Installer</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="Installer FicheMaster IA sur iPhone ou iPad"
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#0A0E19] hover:bg-[#101625] border border-sky-400/35 text-xs font-semibold text-sky-300 transition-colors whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden 2xl:inline">Installer</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Installer sur iPhone ou iPad"
              className="w-full max-w-sm rounded-2xl bg-[#0A0E19] border border-white/[0.12] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-slate-100">
                  Installer sur iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Fermer le guide d'installation"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="space-y-2 text-xs text-slate-300 leading-relaxed list-decimal list-inside">
                <li>
                  Touchez le bouton <strong className="text-amber-300">Partager</strong> dans la barre Safari.
                </li>
                <li>
                  Faites défiler et sélectionnez <strong className="text-amber-300">Sur l&apos;écran d&apos;accueil</strong>.
                </li>
                <li>
                  Confirmez avec <strong className="text-slate-100">Ajouter</strong> pour lancer FicheMaster IA en plein écran.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#04060C] text-xs font-bold transition-colors"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
