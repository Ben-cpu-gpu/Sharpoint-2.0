import React, { useState } from 'react';
import {
  Sparkles,
  BrainCircuit,
  Eye,
  EyeOff,
  ZoomIn,
  Edit3,
  CheckCircle,
  AlertTriangle,
  BookMarked,
  GraduationCap,
  PlusCircle,
  Loader2,
  Wand2,
  Zap,
} from 'lucide-react';
import { StudySheet, MasteryLevel } from '../../types/course';
import { MathView } from '../common/MathView';
import { generateNotion } from '../../services/aiService';
import { useKatexRepairContext } from '../../contexts/KatexRepairContext';
import blackHoleHorizonImg from '../../assets/images/black_hole_horizon_1795123594249.jpg';

interface SheetViewerProps {
  sheet: StudySheet;
  onEdit: () => void;
  onOpenRevision: (initialMode: 'flashcards' | 'quiz') => void;
  onUpdateSheet: (updated: StudySheet) => void;
  onOpenPracticeBatch?: (type: 'td' | 'annale') => void;
  onSelectKatexForRepair?: (snippet: string, scopeType: 'sheet', scopeId: string) => void;
}

export const SheetViewer: React.FC<SheetViewerProps> = ({
  sheet,
  onEdit,
  onOpenRevision,
  onUpdateSheet,
  onOpenPracticeBatch,
  onSelectKatexForRepair,
}) => {
  const [focusLatex, setFocusLatex] = useState(false);
  const [activeRecall, setActiveRecall] = useState(false);
  const { katexRepairMode, toggleKatexRepairMode, onOpenKatexModal } = useKatexRepairContext();
  const [revealedItems, setRevealedItems] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'theorems' | 'formulas' | 'methods' | 'traps'>('all');
  const [imgFailed, setImgFailed] = useState(false);

  const [isAddingNotion, setIsAddingNotion] = useState(false);
  const [notionType, setNotionType] = useState<'theorem' | 'formula' | 'method' | 'trap'>('formula');
  const [notionPrompt, setNotionPrompt] = useState('');
  const [isLoadingNotion, setIsLoadingNotion] = useState(false);
  const [notionError, setNotionError] = useState<string | null>(null);

  const handleOpenFormulaRepair = (snippet: string) => {
    onSelectKatexForRepair?.(snippet, 'sheet', sheet.id);
  };

  const toggleReveal = (id: string) => {
    setRevealedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMasteryChange = (level: MasteryLevel) => {
    onUpdateSheet({ ...sheet, mastery: level });
  };

  const handleAddNotionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notionPrompt.trim()) return;

    setIsLoadingNotion(true);
    setNotionError(null);

    try {
      const context = `Titre: ${sheet.title}. Chapitre: ${sheet.chapter}. Tags: ${sheet.tags.join(', ')}`;
      const result = await generateNotion(notionType, notionPrompt, context);

      const updated = { ...sheet };

      if (notionType === 'theorem') {
        updated.theorems = [
          ...updated.theorems,
          {
            id: `thm_${Date.now()}`,
            name: result.name || 'Nouveau Théorème',
            statement: result.statement || '',
            strictConditions: Array.isArray(result.strictConditions)
              ? result.strictConditions
              : [result.strictConditions || ''],
            professorTip: result.professorTip,
          },
        ];
      } else if (notionType === 'formula') {
        updated.magicFormulas = [
          ...updated.magicFormulas,
          {
            id: `fml_${Date.now()}`,
            name: result.name || 'Nouvelle Formule',
            formula: result.formula || '',
            unitsAndVariables: result.unitsAndVariables || 'Unités SI',
            validityDomain: result.validityDomain || '',
          },
        ];
      } else if (notionType === 'method') {
        updated.stepByStepMethods = [
          ...updated.stepByStepMethods,
          {
            id: `mth_${Date.now()}`,
            goal: result.goal || 'Nouvelle Méthode',
            steps: Array.isArray(result.steps) ? result.steps : [result.steps || ''],
            trapToAvoid: result.trapToAvoid,
          },
        ];
      } else if (notionType === 'trap') {
        updated.examTraps = [...updated.examTraps, result.trap || notionPrompt];
      }

      onUpdateSheet(updated);
      setNotionPrompt('');
      setIsAddingNotion(false);
    } catch (err: any) {
      setNotionError(err?.message || "Échec lors de l'ajout de la notion");
    } finally {
      setIsLoadingNotion(false);
    }
  };

  return (
    <div
      key={sheet.id}
      data-katex-repair-scope="true"
      data-scope-type="sheet"
      data-scope-id={sheet.id}
      data-katex-select-mode={katexRepairMode ? 'true' : 'false'}
      className={`space-y-6 animate-sheet-switch ${focusLatex ? 'latex-focus' : ''}`}
    >
      {/* Event Horizon Hero Header Card */}
      <div className="bg-[#0A0E19] border border-white/[0.1] rounded-2xl p-5 sm:p-7 relative overflow-hidden">
        {/* Atmospheric Black Hole Singularity Backdrop */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-full lg:w-3/5 pointer-events-none overflow-hidden"
        >
          {!imgFailed ? (
            <img
              src={blackHoleHorizonImg}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover object-center opacity-45 scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-500/10 via-[#0A0E19] to-sky-500/10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E19] via-[#0A0E19]/85 to-[#0A0E19]/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E19] via-transparent to-[#0A0E19]/50" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 relative z-10">
          <div className="max-w-2xl">
            <div className="space-y-0.5 mb-2">
              <p className="text-xs text-sky-300 font-medium">{sheet.chapter}</p>
              {sheet.tags.length > 0 && (
                <p className="text-[11px] text-slate-400">
                  {sheet.tags.join(' · ')}
                </p>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight leading-tight">
              {sheet.title}
            </h1>
            <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
              <MathView onOpenRepair={handleOpenFormulaRepair}>{sheet.subtitle}</MathView>
            </p>
          </div>

          {/* Mastery Segmented Control */}
          <div className="flex items-center gap-1 bg-[#04060C]/90 p-1 rounded-xl border border-white/[0.1] shrink-0 self-start">
            <button
              type="button"
              onClick={() => handleMasteryChange('to_learn')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                sheet.mastery === 'to_learn'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/35'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              À apprendre
            </button>
            <button
              type="button"
              onClick={() => handleMasteryChange('learning')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                sheet.mastery === 'learning'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/35'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              En cours
            </button>
            <button
              type="button"
              onClick={() => handleMasteryChange('mastered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                sheet.mastery === 'mastered'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/35'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Maîtrisé
            </button>
          </div>
        </div>

        {/* Ergonomic Toolbar */}
        <div className="relative z-10 mt-6 pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFocusLatex(!focusLatex)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
                focusLatex
                  ? 'bg-amber-500 text-[#04060C] border-amber-400'
                  : 'bg-[#04060C]/80 border-white/[0.1] text-slate-200 hover:border-amber-400/40'
              }`}
              title="Agrandir et mettre en valeur toutes les équations mathématiques"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>{focusLatex ? 'Focus LaTeX actif' : 'Focus LaTeX'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveRecall(!activeRecall)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
                activeRecall
                  ? 'bg-sky-500 text-[#04060C] border-sky-400'
                  : 'bg-[#04060C]/80 border-white/[0.1] text-slate-200 hover:border-sky-400/40'
              }`}
              title="Masquer les formules et réponses pour réciter de tête"
            >
              {activeRecall ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{activeRecall ? 'Active Recall actif' : 'Active Recall'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddingNotion(!isAddingNotion)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#04060C]/80 hover:bg-[#101625] border border-white/[0.1] text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Ajouter notion IA</span>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                role="switch"
                aria-checked={katexRepairMode}
                onClick={toggleKatexRepairMode}
                aria-label="Interrupteur mode ciblage et réparation KaTeX"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border cursor-pointer ${
                  katexRepairMode
                    ? 'bg-amber-500/18 text-amber-200 border-amber-400/55'
                    : 'bg-[#04060C]/80 border-white/[0.1] text-slate-300 hover:border-amber-400/40'
                }`}
                title="Activez cet interrupteur pour afficher les outils Cibler / Réparer sur toutes les formules"
              >
                <span
                  aria-hidden="true"
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                    katexRepairMode ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                      katexRepairMode ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </span>
                <span>Mode KaTeX</span>
              </button>

              {katexRepairMode && (
                <button
                  type="button"
                  onClick={() => onOpenKatexModal('')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 border border-amber-300 text-[#04060C] text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer animate-fade-in"
                  title="Cliquez sur une formule de la fiche ou ouvrez le réparateur KaTeX"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Cibler / Réparer</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenPracticeBatch && (
              <button
                type="button"
                onClick={() => onOpenPracticeBatch('td')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101625] hover:bg-[#161F35] border border-emerald-400/30 text-emerald-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                title="Générer plusieurs exercices ou annales corrigés à partir de ce cours"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Générer Exercices IA</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenRevision('flashcards')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101625] hover:bg-[#161F35] border border-sky-400/25 text-sky-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <BrainCircuit className="w-3.5 h-3.5 text-sky-400" />
              <span>Flashcards</span>
              <span className="font-mono text-[11px] text-sky-300/80">({sheet.flashcards.length})</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenRevision('quiz')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101625] hover:bg-[#161F35] border border-amber-400/30 text-amber-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
              <span>Quiz QCM</span>
              <span className="font-mono text-[11px] text-amber-300/80">({sheet.quiz.length})</span>
            </button>

            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#04060C]/80 hover:bg-[#101625] border border-white/[0.1] text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modifier</span>
            </button>
          </div>
        </div>

        {/* Formulaire d'ajout de notion IA */}
        {isAddingNotion && (
          <form
            onSubmit={handleAddNotionSubmit}
            className="relative z-10 mt-4 p-4 rounded-xl bg-[#04060C]/95 border border-amber-400/30 space-y-3 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Générer et injecter une notion chirurgicale
              </span>
              <button
                type="button"
                onClick={() => setIsAddingNotion(false)}
                className="text-slate-400 hover:text-white text-xs font-medium"
              >
                Fermer
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['formula', 'theorem', 'method', 'trap'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setNotionType(type)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    notionType === type
                      ? 'bg-amber-500 text-[#04060C] font-semibold'
                      : 'bg-[#0A0E19] text-slate-300 border border-white/[0.08] hover:text-white'
                  }`}
                >
                  {type === 'formula' && 'Formule Magique'}
                  {type === 'theorem' && 'Théorème & Hypothèses'}
                  {type === 'method' && 'Méthode pas à pas'}
                  {type === 'trap' && "Piège d'Examen"}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={notionPrompt}
                onChange={e => setNotionPrompt(e.target.value)}
                placeholder="Ex: Équation de Navier-Stokes en régime stationnaire avec unités SI..."
                className="flex-1 rounded-lg bg-[#0A0E19] border border-white/[0.12] px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60"
              />
              <button
                type="submit"
                disabled={isLoadingNotion || !notionPrompt.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-[#04060C] text-xs font-bold transition-colors whitespace-nowrap"
              >
                {isLoadingNotion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Générer</span>
              </button>
            </div>

            {notionError && <p className="text-xs text-rose-400">{notionError}</p>}
          </form>
        )}
      </div>

      {/* Section Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
            activeTab === 'all'
              ? 'bg-[#101625] text-amber-300 border-amber-400/40'
              : 'bg-transparent border-transparent text-slate-400 hover:text-slate-100 hover:bg-[#0A0E19]'
          }`}
        >
          Tout afficher
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('theorems')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
            activeTab === 'theorems'
              ? 'bg-[#101625] text-sky-300 border-sky-400/40'
              : 'bg-transparent border-transparent text-slate-400 hover:text-slate-100 hover:bg-[#0A0E19]'
          }`}
        >
          Théorèmes <span className="font-mono text-[11px] opacity-75">({sheet.theorems.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('formulas')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
            activeTab === 'formulas'
              ? 'bg-[#101625] text-amber-300 border-amber-400/40'
              : 'bg-transparent border-transparent text-slate-400 hover:text-slate-100 hover:bg-[#0A0E19]'
          }`}
        >
          Formules Magiques <span className="font-mono text-[11px] opacity-75">({sheet.magicFormulas.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('methods')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
            activeTab === 'methods'
              ? 'bg-[#101625] text-emerald-300 border-emerald-400/40'
              : 'bg-transparent border-transparent text-slate-400 hover:text-slate-100 hover:bg-[#0A0E19]'
          }`}
        >
          Méthodes <span className="font-mono text-[11px] opacity-75">({sheet.stepByStepMethods.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('traps')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
            activeTab === 'traps'
              ? 'bg-[#101625] text-rose-300 border-rose-400/40'
              : 'bg-transparent border-transparent text-slate-400 hover:text-slate-100 hover:bg-[#0A0E19]'
          }`}
        >
          Pièges d'Examen <span className="font-mono text-[11px] opacity-75">({sheet.examTraps.length})</span>
        </button>
      </div>

      {/* 1. THÉORÈMES */}
      {(activeTab === 'all' || activeTab === 'theorems') && sheet.theorems.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <BookMarked className="w-4 h-4 text-sky-400" />
            <h2 className="font-display text-lg font-semibold text-slate-100 tracking-tight">
              Théorèmes Fondamentaux & Hypothèses
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {sheet.theorems.map((thm, index) => {
              const isHidden = activeRecall && !revealedItems[thm.id];

              return (
                <article
                  key={thm.id}
                  className="rounded-2xl bg-[#0A0E19] border border-white/[0.08] hover:border-sky-400/30 p-5 sm:p-6 card-hover-cosmos"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-baseline gap-2.5">
                      <span className="font-mono text-xs text-sky-400 font-semibold">
                        0{index + 1}.
                      </span>
                      <h3 className="font-display text-base font-semibold text-slate-100">
                        {thm.name}
                      </h3>
                    </div>
                    {activeRecall && (
                      <button
                        type="button"
                        onClick={() => toggleReveal(thm.id)}
                        className="text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-400/30 px-2.5 py-1 rounded-lg font-semibold shrink-0"
                      >
                        {isHidden ? 'Révéler' : 'Masquer'}
                      </button>
                    )}
                  </div>

                  {/* Equation Well */}
                  <div className="my-4 p-4 rounded-xl bg-[#04060C] border border-white/[0.07] text-center">
                    {isHidden ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        Active Recall : récitez l'énoncé mathématique de tête, puis révélez.
                      </p>
                    ) : (
                      <MathView math={thm.statement} onOpenRepair={handleOpenFormulaRepair} />
                    )}
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Hypothèses strictes requises</span>
                    </p>
                    {isHidden ? (
                      <p className="text-xs text-slate-500 italic">Hypothèses masquées</p>
                    ) : (
                      <ul className="space-y-1.5 pl-1">
                        {thm.strictConditions.map((cond, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed">
                            <span className="text-sky-400 font-mono mt-0.5">—</span>
                            <MathView onOpenRepair={handleOpenFormulaRepair}>{cond}</MathView>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {thm.professorTip && !isHidden && (
                    <div className="mt-4 pt-3.5 border-t border-white/[0.06] text-xs text-slate-300 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong className="text-amber-300 font-semibold">Astuce d'examen : </strong>
                        <MathView onOpenRepair={handleOpenFormulaRepair}>{thm.professorTip}</MathView>
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. FORMULES MAGIQUES */}
      {(activeTab === 'all' || activeTab === 'formulas') && sheet.magicFormulas.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="font-display text-lg font-semibold text-slate-100 tracking-tight">
              Formules Clés & Unités SI
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sheet.magicFormulas.map(formula => {
              const isHidden = activeRecall && !revealedItems[formula.id];

              return (
                <article
                  key={formula.id}
                  className="rounded-2xl bg-[#0A0E19] border border-white/[0.08] hover:border-amber-400/30 p-5 flex flex-col justify-between card-hover-cosmos"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-sm font-semibold text-amber-200">
                        {formula.name}
                      </h3>
                      {activeRecall && (
                        <button
                          type="button"
                          onClick={() => toggleReveal(formula.id)}
                          className="text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-400/30 px-2.5 py-1 rounded-lg font-semibold shrink-0"
                        >
                          {isHidden ? 'Révéler' : 'Masquer'}
                        </button>
                      )}
                    </div>

                    <div className="my-3.5 p-3.5 rounded-xl bg-[#04060C] border border-white/[0.07] text-center">
                      {isHidden ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          Formule masquée pour auto-évaluation
                        </p>
                      ) : (
                        <MathView math={formula.formula} block onOpenRepair={handleOpenFormulaRepair} />
                      )}
                    </div>

                    <div className="space-y-2 text-xs leading-relaxed">
                      <div>
                        <span className="font-semibold text-slate-400">Variables & SI : </span>
                        {isHidden ? (
                          <span className="text-slate-500 italic">Masqué</span>
                        ) : (
                          <span className="text-slate-200">
                            <MathView onOpenRepair={handleOpenFormulaRepair}>{formula.unitsAndVariables}</MathView>
                          </span>
                        )}
                      </div>

                      {formula.validityDomain && !isHidden && (
                        <div>
                          <span className="font-semibold text-slate-400">Validité : </span>
                          <span className="text-slate-300">
                            <MathView onOpenRepair={handleOpenFormulaRepair}>{formula.validityDomain}</MathView>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. MÉTHODES PAS À PAS */}
      {(activeTab === 'all' || activeTab === 'methods') && sheet.stepByStepMethods.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <h2 className="font-display text-lg font-semibold text-slate-100 tracking-tight">
              Méthodes de Résolution Pas à Pas
            </h2>
          </div>

          <div className="space-y-4">
            {sheet.stepByStepMethods.map(method => {
              const isHidden = activeRecall && !revealedItems[method.id];

              return (
                <article
                  key={method.id}
                  className="rounded-2xl bg-[#0A0E19] border border-white/[0.08] p-5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h3 className="font-display text-sm font-semibold text-emerald-300">
                      {method.goal}
                    </h3>
                    {activeRecall && (
                      <button
                        type="button"
                        onClick={() => toggleReveal(method.id)}
                        className="text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-400/30 px-2.5 py-1 rounded-lg font-semibold shrink-0"
                      >
                        {isHidden ? 'Révéler les étapes' : 'Masquer'}
                      </button>
                    )}
                  </div>

                  {isHidden ? (
                    <p className="text-xs text-slate-400 italic py-3 px-4 bg-[#04060C] rounded-xl border border-white/[0.06]">
                      Étapes masquées : formulez votre démarche complète avant de révéler.
                    </p>
                  ) : (
                    <ol className="space-y-2 mb-4">
                      {method.steps.map((step, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-slate-200 flex items-start gap-3 bg-[#04060C] px-3.5 py-2.5 rounded-xl border border-white/[0.06]"
                        >
                          <span className="font-mono text-emerald-400 font-semibold">0{idx + 1}</span>
                          <div className="flex-1 leading-relaxed">
                            <MathView onOpenRepair={handleOpenFormulaRepair}>{step}</MathView>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}

                  {method.trapToAvoid && !isHidden && (
                    <div className="pt-3 border-t border-white/[0.06] text-xs text-amber-200/90 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-amber-300 font-semibold">Piège à éviter : </strong>
                        <MathView onOpenRepair={handleOpenFormulaRepair}>{method.trapToAvoid}</MathView>
                      </span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. PIÈGES D'EXAMEN */}
      {(activeTab === 'all' || activeTab === 'traps') && sheet.examTraps.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h2 className="font-display text-lg font-semibold text-slate-100 tracking-tight">
              Pièges d'Examen & Erreurs à Bannir
            </h2>
          </div>

          <div className="rounded-2xl bg-[#0A0E19] border border-rose-500/25 p-5 space-y-2.5">
            {sheet.examTraps.map((trap, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs text-rose-200/90 leading-relaxed">
                <span className="font-mono text-rose-400 font-bold shrink-0">0{idx + 1}</span>
                <span>
                  <MathView onOpenRepair={handleOpenFormulaRepair}>{trap}</MathView>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. TRAINING LAUNCHERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="p-5 rounded-2xl bg-[#0A0E19] border border-sky-400/25 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sky-400 mb-2">
              <BrainCircuit className="w-4 h-4" />
              <h3 className="font-display font-semibold text-sm text-slate-100">
                Cartes Réflexes (Flashcards)
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {sheet.flashcards.length} cartes recto/verso pour ancrer les définitions et réflexes de calcul.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenRevision('flashcards')}
            className="mt-4 w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-[#04060C] font-bold text-xs transition-colors"
          >
            Lancer la session Flashcards
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-[#0A0E19] border border-amber-400/25 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <GraduationCap className="w-4 h-4" />
              <h3 className="font-display font-semibold text-sm text-slate-100">
                QCM d'Auto-Évaluation Noté
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {sheet.quiz.length} questions avec barème ESTACA et corrections pédagogiques détaillées.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenRevision('quiz')}
            className="mt-4 w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#04060C] font-bold text-xs transition-colors"
          >
            Passer le Quiz Noté
          </button>
        </div>
      </div>
    </div>
  );
};
