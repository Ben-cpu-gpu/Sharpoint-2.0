import React from 'react';
import { BookOpen, Calculator, GraduationCap, Settings, PlusCircle } from 'lucide-react';
import { MainTab } from './Header';

interface MobileBottomNavProps {
  currentTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  onOpenIngest: () => void;
  onOpenSettings: () => void;
  counts: {
    sheets: number;
    td: number;
    annales: number;
  };
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onTabChange,
  onOpenIngest,
  onOpenSettings,
  counts,
}) => {
  return (
    <nav
      aria-label="Navigation mobile"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#04060C]/95 border-t border-white/[0.08] backdrop-blur-xl px-2 py-1.5 flex items-center justify-around safe-area-pb"
    >
      <button
        type="button"
        onClick={() => onTabChange('sheets')}
        className={`flex flex-col items-center justify-center min-h-[44px] px-2.5 rounded-lg transition-colors ${
          currentTab === 'sheets' ? 'text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-100'
        }`}
      >
        <div className="flex items-center gap-1">
          <BookOpen className="w-4 h-4" />
          <span className="font-mono text-[10px]">{counts.sheets}</span>
        </div>
        <span className="text-[10px] mt-0.5">Fiches</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('td')}
        className={`flex flex-col items-center justify-center min-h-[44px] px-2.5 rounded-lg transition-colors ${
          currentTab === 'td' ? 'text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-100'
        }`}
      >
        <div className="flex items-center gap-1">
          <Calculator className="w-4 h-4" />
          <span className="font-mono text-[10px]">{counts.td}</span>
        </div>
        <span className="text-[10px] mt-0.5">TD</span>
      </button>

      <button
        type="button"
        onClick={onOpenIngest}
        aria-label="Ingérer un PDF ou cours"
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#04060C] text-xs font-bold shadow-[0_0_18px_-4px_rgba(245,158,11,0.55)] active:scale-95 transition-transform"
      >
        <PlusCircle className="w-4 h-4" />
        <span>Ingérer</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('annales')}
        className={`flex flex-col items-center justify-center min-h-[44px] px-2.5 rounded-lg transition-colors ${
          currentTab === 'annales' ? 'text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-100'
        }`}
      >
        <div className="flex items-center gap-1">
          <GraduationCap className="w-4 h-4" />
          <span className="font-mono text-[10px]">{counts.annales}</span>
        </div>
        <span className="text-[10px] mt-0.5">Annales</span>
      </button>

      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Ouvrir les paramètres de modèle IA"
        className="flex flex-col items-center justify-center min-h-[44px] px-2.5 rounded-lg text-slate-400 hover:text-white transition-colors"
      >
        <Settings className="w-4 h-4" />
        <span className="text-[10px] mt-0.5">Modèles</span>
      </button>
    </nav>
  );
};
