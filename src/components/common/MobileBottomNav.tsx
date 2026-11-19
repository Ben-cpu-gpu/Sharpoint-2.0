import React from 'react';
import { BookOpen, Calculator, GraduationCap, PlusCircle, Settings, Sparkles } from 'lucide-react';
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
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#131314]/95 border-t border-[#282a2c] backdrop-blur-xl px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-pb">
      {/* 1. Fiches */}
      <button
        onClick={() => onTabChange('sheets')}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
          currentTab === 'sheets'
            ? 'text-blue-400 font-bold scale-105'
            : 'text-[#8e918f] hover:text-[#e3e3e3]'
        }`}
      >
        <div className="relative">
          <BookOpen className="w-5 h-5" />
          {counts.sheets > 0 && (
            <span className="absolute -top-1 -right-2 bg-blue-600 text-white text-[9px] font-bold px-1 rounded-full">
              {counts.sheets}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5">Fiches</span>
      </button>

      {/* 2. TD */}
      <button
        onClick={() => onTabChange('td')}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
          currentTab === 'td'
            ? 'text-blue-400 font-bold scale-105'
            : 'text-[#8e918f] hover:text-[#e3e3e3]'
        }`}
      >
        <div className="relative">
          <Calculator className="w-5 h-5" />
          {counts.td > 0 && (
            <span className="absolute -top-1 -right-2 bg-blue-600 text-white text-[9px] font-bold px-1 rounded-full">
              {counts.td}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5">TD & Exo</span>
      </button>

      {/* 3. Bouton Central Ingestion IA (Google Sparkle) */}
      <button
        onClick={onOpenIngest}
        className="flex flex-col items-center justify-center -mt-4 bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white p-2.5 rounded-2xl shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"
      >
        <Sparkles className="w-5 h-5" />
        <span className="text-[9px] font-extrabold mt-0.5">Ingérer</span>
      </button>

      {/* 4. Annales */}
      <button
        onClick={() => onTabChange('annales')}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
          currentTab === 'annales'
            ? 'text-blue-400 font-bold scale-105'
            : 'text-[#8e918f] hover:text-[#e3e3e3]'
        }`}
      >
        <div className="relative">
          <GraduationCap className="w-5 h-5" />
          {counts.annales > 0 && (
            <span className="absolute -top-1 -right-2 bg-blue-600 text-white text-[9px] font-bold px-1 rounded-full">
              {counts.annales}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5">Annales</span>
      </button>

      {/* 5. Réglages API */}
      <button
        onClick={onOpenSettings}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[#8e918f] hover:text-white transition-colors"
      >
        <Settings className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Studio</span>
      </button>
    </nav>
  );
};
