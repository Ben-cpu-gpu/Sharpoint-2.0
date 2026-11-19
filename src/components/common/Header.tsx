import React, { useRef } from 'react';
import { 
  BookOpen, 
  Calculator, 
  GraduationCap, 
  PlusCircle, 
  Save, 
  Download, 
  Upload, 
  Sparkles, 
  Key, 
  ChevronDown 
} from 'lucide-react';
import { Subject } from '../../types/course';
import { availableSubjects } from '../../data/initialData';
import { getSelectedModel, ALL_MODELS, hasActiveKeyForCurrentModel, getSelectedProvider } from '../../services/apiKeyService';

export type MainTab = 'sheets' | 'td' | 'annales';

interface HeaderProps {
  currentTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  onOpenIngest: () => void;
  onOpenSettings: () => void;
  onManualSave: () => void;
  lastSavedTime: string | null;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  selectedSubjectId: string | 'all';
  onSubjectChange: (subjectId: string | 'all') => void;
  counts: {
    sheets: number;
    td: number;
    annales: number;
  };
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onOpenIngest,
  onOpenSettings,
  onManualSave,
  lastSavedTime,
  onExportJson,
  onImportJson,
  selectedSubjectId,
  onSubjectChange,
  counts,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentModelId = getSelectedModel();
  const currentProvider = getSelectedProvider();
  const isKeyConfigured = hasActiveKeyForCurrentModel();

  const modelObj = ALL_MODELS.find(m => m.id === currentModelId);
  const modelDisplayName = modelObj ? modelObj.name : currentModelId;
  const modelBadge = modelObj ? modelObj.badge : 'IA';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJson(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-[#131314]/90 backdrop-blur-md border-b border-[#282a2c] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Ligne Supérieure : Marque Google AI Studio & Sélecteur de Modèle Avancé */}
        <div className="flex items-center justify-between py-2.5 gap-2 sm:gap-4">
          {/* Logo & Titre */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10 shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs font-medium text-[#8e918f] hidden md:inline">
                  Gemini Notebook
                </span>
                <span className="text-xs text-[#8e918f] hidden md:inline">•</span>
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  FicheMaster <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-pink-400 bg-clip-text text-transparent">IA</span>
                </h1>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  ESTACA
                </span>
              </div>
            </div>
          </div>

          {/* Sélecteur de Modèle Dynamique (Gemini 3, Claude 5.5, GPT-5, Local) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Pillule Modèle */}
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#1e1f20] hover:bg-[#282a2c] border border-[#37393b] text-xs text-[#e3e3e3] font-medium transition-colors"
              title="Changer de modèle : Gemini 3, Claude 5.5, GPT-5 ou Mode Local"
            >
              <div className={`w-2 h-2 rounded-full ${
                currentProvider === 'local' ? 'bg-amber-400' :
                currentProvider === 'claude' ? 'bg-purple-400' :
                currentProvider === 'openai' ? 'bg-emerald-400' : 'bg-blue-400'
              }`} />
              <span className="font-semibold text-[11px] truncate max-w-[120px] sm:max-w-none">
                {modelBadge} : {modelDisplayName.split('(')[0].trim()}
              </span>
              <ChevronDown className="w-3 h-3 text-[#8e918f]" />
            </button>

            {/* Statut Clé API */}
            <button
              onClick={onOpenSettings}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border ${
                isKeyConfigured || currentProvider === 'local'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40 hover:bg-emerald-950/60'
                  : 'bg-blue-600/20 text-blue-300 border-blue-500/40 hover:bg-blue-600/30'
              }`}
            >
              <Key className="w-3 h-3" />
              <span className="hidden sm:inline">
                {currentProvider === 'local' ? '100% Offline' : isKeyConfigured ? 'Prêt' : 'Régler Clé'}
              </span>
            </button>

            {/* Sauvegarde Manuelle */}
            <button
              onClick={onManualSave}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#1e1f20] hover:bg-[#282a2c] text-[#e3e3e3] border border-[#37393b] text-xs font-medium transition-all active:scale-95"
              title="Sauvegarder dans localStorage"
            >
              <Save className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden lg:inline">
                {lastSavedTime ? `Sauvé ${lastSavedTime}` : 'Sauvegarder'}
              </span>
            </button>

            {/* Ingestion Desktop */}
            <button
              onClick={onOpenIngest}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Ingérer Cours/PDF</span>
            </button>

            {/* Export / Import rapides */}
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={onExportJson}
                className="p-1.5 rounded-lg text-[#8e918f] hover:text-white hover:bg-[#1e1f20] transition-colors"
                title="Exporter JSON"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-lg text-[#8e918f] hover:text-white hover:bg-[#1e1f20] transition-colors"
                title="Importer JSON"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Ligne Inférieure Desktop : Onglets des 3 Piliers & Filtres Matières */}
        <div className="hidden sm:flex items-center justify-between pb-2 pt-1 gap-3 border-t border-[#282a2c]">
          <nav className="flex space-x-1.5">
            <button
              onClick={() => onTabChange('sheets')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'sheets'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-[#8e918f] hover:text-white hover:bg-[#1e1f20]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Fiches de Cours</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
                {counts.sheets}
              </span>
            </button>

            <button
              onClick={() => onTabChange('td')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'td'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-[#8e918f] hover:text-white hover:bg-[#1e1f20]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Exercices & TD</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
                {counts.td}
              </span>
            </button>

            <button
              onClick={() => onTabChange('annales')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'annales'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-[#8e918f] hover:text-white hover:bg-[#1e1f20]'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Annales d'Examens</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
                {counts.annales}
              </span>
            </button>
          </nav>

          {/* Filtre Rapide Matière ESTACA */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => onSubjectChange('all')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                selectedSubjectId === 'all'
                  ? 'bg-[#282a2c] text-blue-300 border border-blue-500/40'
                  : 'text-[#8e918f] hover:text-white'
              }`}
            >
              Toutes matières
            </button>
            {availableSubjects.map((sub: Subject) => (
              <button
                key={sub.id}
                onClick={() => onSubjectChange(sub.id)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                  selectedSubjectId === sub.id
                    ? 'bg-blue-950/60 text-blue-300 border border-blue-500/40'
                    : 'text-[#8e918f] hover:text-white'
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
