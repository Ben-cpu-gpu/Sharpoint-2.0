import React, { useRef } from 'react';
import {
  BookOpen,
  Calculator,
  GraduationCap,
  PlusCircle,
  Save,
  Download,
  Upload,
  Key,
  ChevronDown,
  Focus,
  Orbit,
  Wand2,
} from 'lucide-react';
import { getSelectedModel, ALL_MODELS, hasActiveKeyForCurrentModel, getSelectedProvider } from '../../services/apiKeyService';

import { ProviderHealthState } from '../../types/course';
import { PWAInstallButton } from './PWAInstallButton';
import { CloudSyncControl, CloudSyncState, MobileAuthError } from './CloudSyncControl';
import { User } from 'firebase/auth';

export type MainTab = 'sheets' | 'td' | 'annales';

interface HeaderProps {
  currentTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  onOpenIngest: () => void;
  onOpenSettings: () => void;
  onOpenKatexRepair: () => void;
  onManualSave: () => void;
  lastSavedTime: string | null;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  activeHealthStatus?: ProviderHealthState;
  counts: {
    sheets: number;
    td: number;
    annales: number;
  };
  cloudUser: User | null;
  authReady: boolean;
  syncState: CloudSyncState;
  syncError: string | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  authError: MobileAuthError | null;
  onDismissAuthError: () => void;
  onRetryRedirectSignIn: () => Promise<void>;
  focusMode: boolean;
  onToggleFocusMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onOpenIngest,
  onOpenSettings,
  onOpenKatexRepair,
  onManualSave,
  lastSavedTime,
  onExportJson,
  onImportJson,
  activeHealthStatus,
  counts,
  cloudUser,
  authReady,
  syncState,
  syncError,
  onSignIn,
  onSignOut,
  authError,
  onDismissAuthError,
  onRetryRedirectSignIn,
  focusMode,
  onToggleFocusMode,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentModelId = getSelectedModel();
  const currentProvider = getSelectedProvider();
  const isKeyConfigured = hasActiveKeyForCurrentModel();

  const modelObj = ALL_MODELS.find(m => m.id === currentModelId);
  const modelDisplayName = modelObj ? modelObj.name.split('(')[0].trim() : currentModelId;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJson(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-[#04060C]/92 border-b border-white/[0.08]">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-5 lg:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3 lg:gap-4 min-w-0">
        {/* Zone 1: Brand Singularity Wordmark */}
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <svg
            aria-hidden="true"
            viewBox="0 0 36 36"
            className="w-7 h-7 sm:w-8 sm:h-8 shrink-0"
            fill="none"
          >
            <defs>
              <linearGradient id="accretionRing" x1="2" y1="26" x2="34" y2="10" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="48%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
            </defs>
            <circle cx="18" cy="18" r="10.5" stroke="url(#accretionRing)" strokeWidth="1.35" opacity="0.7" />
            <ellipse
              cx="18"
              cy="18"
              rx="16"
              ry="5"
              transform="rotate(-18 18 18)"
              stroke="url(#accretionRing)"
              strokeWidth="1.75"
            />
            <circle cx="18" cy="18" r="7.5" fill="#04060C" stroke="#F59E0B" strokeOpacity="0.45" strokeWidth="1" />
          </svg>
          <span className="font-display text-sm sm:text-base lg:text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
            FicheMaster <span className="text-amber-400">IA</span>
          </span>
        </div>

        {/* Zone 2: Primary Navigation Tabs (md+ while MobileBottomNav handles <md) */}
        <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-3 lg:gap-5 shrink-0">
          <button
            type="button"
            onClick={() => onTabChange('sheets')}
            className={`relative flex items-center gap-1.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'sheets'
                ? 'text-amber-300'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="lg:hidden">Fiches</span>
            <span className="hidden lg:inline">Fiches de Cours</span>
            <span className="font-mono text-[11px] text-slate-500">({counts.sheets})</span>
            {currentTab === 'sheets' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('td')}
            className={`relative flex items-center gap-1.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'td'
                ? 'text-amber-300'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span className="lg:hidden">TD</span>
            <span className="hidden lg:inline">Exercices & TD</span>
            <span className="font-mono text-[11px] text-slate-500">({counts.td})</span>
            {currentTab === 'td' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('annales')}
            className={`relative flex items-center gap-1.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'annales'
                ? 'text-amber-300'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Annales</span>
            <span className="font-mono text-[11px] text-slate-500">({counts.annales})</span>
            {currentTab === 'annales' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-400 rounded-full" />
            )}
          </button>
        </nav>

        {/* Zone 3: Controls & Primary CTA */}
        <div className="flex items-center gap-1.5 shrink-0 min-w-0">
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Ouvrir le Tableau de Bord IA et les clés API"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-[#0A0E19] hover:bg-[#101625] border border-white/[0.1] text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Key className={`w-3.5 h-3.5 ${isKeyConfigured || currentProvider === 'local' ? 'text-amber-400' : 'text-sky-400'}`} />
            <span className="hidden lg:inline max-w-[115px] xl:max-w-[130px] truncate">{modelDisplayName}</span>
            <span
              aria-hidden="true"
              className={`w-2 h-2 rounded-full shrink-0 ${
                activeHealthStatus === 'ok'
                  ? 'bg-emerald-400'
                  : activeHealthStatus === 'error'
                  ? 'bg-rose-400'
                  : isKeyConfigured || currentProvider === 'local'
                  ? 'bg-sky-400'
                  : 'bg-slate-500'
              }`}
            />
            <ChevronDown className="hidden sm:inline w-3 h-3 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={onOpenKatexRepair}
            aria-label="Ouvrir le réparateur KaTeX IA"
            title="Assistant de réparation KaTeX & LaTeX"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0A0E19] hover:bg-[#101625] border border-amber-400/35 text-xs font-semibold text-amber-300 transition-colors whitespace-nowrap shrink-0"
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">KaTeX AI</span>
          </button>

          <button
            type="button"
            onClick={onManualSave}
            aria-label="Sauvegarder les données localement"
            title={lastSavedTime ? `Dernière sauvegarde : ${lastSavedTime}` : 'Sauvegarder'}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#0A0E19] hover:bg-[#101625] border border-white/[0.1] text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Save className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden 2xl:inline font-mono text-[11px]">
              {lastSavedTime ? lastSavedTime : 'Sauver'}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleFocusMode}
            aria-pressed={focusMode}
            aria-label={
              focusMode
                ? 'Désactiver le Mode Focus et réactiver les animations 3D'
                : 'Activer le Mode Focus pour enlever les animations 3D'
            }
            title={focusMode ? 'Mode Focus actif (animations 3D masquées)' : 'Activer le Mode Focus (couper les animations 3D)'}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              focusMode
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                : 'bg-[#0A0E19] hover:bg-[#101625] border-white/[0.1] text-slate-300 hover:text-white'
            }`}
          >
            {focusMode ? (
              <Focus className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Orbit className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span className="hidden sm:inline">{focusMode ? 'Focus ON' : 'Focus'}</span>
          </button>

          <PWAInstallButton />

          <CloudSyncControl
            user={cloudUser}
            authReady={authReady}
            syncState={syncState}
            syncError={syncError}
            authError={authError}
            onDismissAuthError={onDismissAuthError}
            onRetryRedirectSignIn={onRetryRedirectSignIn}
            onSignIn={onSignIn}
            onSignOut={onSignOut}
          />

          <div className="hidden xl:flex items-center gap-0.5">
            <button
              type="button"
              onClick={onExportJson}
              aria-label="Exporter les données en JSON"
              title="Exporter JSON"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
              aria-label="Importer un fichier JSON"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Importer des données JSON"
              title="Importer JSON"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenIngest}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#04060C] text-xs font-bold transition-all active:scale-[0.98] whitespace-nowrap shrink-0 shadow-[0_0_20px_-6px_rgba(245,158,11,0.55)]"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Ingérer PDF</span>
          </button>
        </div>
      </div>
    </header>
  );
};
