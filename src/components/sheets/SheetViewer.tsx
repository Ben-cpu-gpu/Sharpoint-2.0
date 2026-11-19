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
  HelpCircle, 
  GraduationCap, 
  PlusCircle, 
  Loader2 
} from 'lucide-react';
import { StudySheet, MasteryLevel } from '../../types/course';
import { MathView } from '../common/MathView';
import { generateNotion } from '../../services/aiService';

interface SheetViewerProps {
  sheet: StudySheet;
  onEdit: () => void;
  onOpenRevision: (initialMode: 'flashcards' | 'quiz') => void;
  onUpdateSheet: (updated: StudySheet) => void;
}

export const SheetViewer: React.FC<SheetViewerProps> = ({
  sheet,
  onEdit,
  onOpenRevision,
  onUpdateSheet,
}) => {
  const [focusLatex, setFocusLatex] = useState(false);
  const [activeRecall, setActiveRecall] = useState(false);
  const [revealedItems, setRevealedItems] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'theorems' | 'formulas' | 'methods' | 'traps'>('all');
  
  // État d'enrichissement IA ponctuel
  const [isAddingNotion, setIsAddingNotion] = useState(false);
  const [notionType, setNotionType] = useState<'theorem' | 'formula' | 'method' | 'trap'>('formula');
  const [notionPrompt, setNotionPrompt] = useState('');
  const [isLoadingNotion, setIsLoadingNotion] = useState(false);
  const [notionError, setNotionError] = useState<string | null>(null);

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
            strictConditions: Array.isArray(result.strictConditions) ? result.strictConditions : [result.strictConditions || ''],
            professorTip: result.professorTip,
          }
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
          }
        ];
      } else if (notionType === 'method') {
        updated.stepByStepMethods = [
          ...updated.stepByStepMethods,
          {
            id: `mth_${Date.now()}`,
            goal: result.goal || 'Nouvelle Méthode',
            steps: Array.isArray(result.steps) ? result.steps : [result.steps || ''],
            trapToAvoid: result.trapToAvoid,
          }
        ];
      } else if (notionType === 'trap') {
        updated.examTraps = [...updated.examTraps, result.trap || notionPrompt];
      }

      onUpdateSheet(updated);
      setNotionPrompt('');
      setIsAddingNotion(false);
    } catch (err: any) {
      setNotionError(err?.message || 'Échec lors de l\'ajout de la notion');
    } finally {
      setIsLoadingNotion(false);
    }
  };

  return (
    <div className={`space-y-6 ${focusLatex ? 'latex-focus' : ''}`}>
      {/* En-tête de la fiche avec métadonnées et contrôles ergonomiques */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Halo décoratif */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                {sheet.chapter}
              </span>
              {sheet.tags.map(tag => (
                <span key={tag} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                  #{tag}
                </span>
              ))}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {sheet.title}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {sheet.subtitle}
            </p>
          </div>

          {/* Statut de Maîtrise */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800 shrink-0 self-start lg:self-center">
            <button
              onClick={() => handleMasteryChange('to_learn')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                sheet.mastery === 'to_learn'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              À apprendre
            </button>
            <button
              onClick={() => handleMasteryChange('learning')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                sheet.mastery === 'learning'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              En cours
            </button>
            <button
              onClick={() => handleMasteryChange('mastered')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                sheet.mastery === 'mastered'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Maîtrisé ✓
            </button>
          </div>
        </div>

        {/* Barre d'outils interactifs : Focus LaTeX, Active Recall, Entraînement */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Focus LaTeX */}
            <button
              onClick={() => setFocusLatex(!focusLatex)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                focusLatex
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Agrandir et mettre en valeur toutes les équations mathématiques"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Focus LaTeX {focusLatex ? 'Activé' : ''}</span>
            </button>

            {/* Toggle Active Recall */}
            <button
              onClick={() => setActiveRecall(!activeRecall)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeRecall
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Masquer les formules et réponses pour réciter de tête"
            >
              {activeRecall ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>Active Recall {activeRecall ? 'Activé' : ''}</span>
            </button>

            {/* Ajouter une notion via IA */}
            <button
              onClick={() => setIsAddingNotion(!isAddingNotion)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ajouter notion IA</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Boutons d'entraînement interactif */}
            <button
              onClick={() => onOpenRevision('flashcards')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/50 text-indigo-300 text-xs font-semibold transition-all"
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>Flashcards ({sheet.flashcards.length})</span>
            </button>

            <button
              onClick={() => onOpenRevision('quiz')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 text-purple-300 text-xs font-semibold transition-all"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Quiz QCM ({sheet.quiz.length})</span>
            </button>

            {/* Éditer la fiche */}
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modifier</span>
            </button>
          </div>
        </div>

        {/* Formulaire d'ajout de notion IA (dépliable) */}
        {isAddingNotion && (
          <form onSubmit={handleAddNotionSubmit} className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-indigo-500/30 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Générer et injecter une notion chirurgicale
              </span>
              <button
                type="button"
                onClick={() => setIsAddingNotion(false)}
                className="text-slate-400 hover:text-white text-xs"
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
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    notionType === type
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type === 'formula' && 'Formule Magique'}
                  {type === 'theorem' && 'Théorème & Hypothèses'}
                  {type === 'method' && 'Méthode pas à pas'}
                  {type === 'trap' && 'Piège d\'Examen'}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={notionPrompt}
                onChange={e => setNotionPrompt(e.target.value)}
                placeholder="Ex: Équation de Navier-Stokes en régime stationnaire avec unités SI..."
                className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isLoadingNotion || !notionPrompt.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all"
              >
                {isLoadingNotion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Générer</span>
              </button>
            </div>

            {notionError && (
              <p className="text-xs text-red-400">{notionError}</p>
            )}
          </form>
        )}
      </div>

      {/* Barre de filtres de sections */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Tout afficher
        </button>
        <button
          onClick={() => setActiveTab('theorems')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'theorems'
              ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Théorèmes ({sheet.theorems.length})
        </button>
        <button
          onClick={() => setActiveTab('formulas')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'formulas'
              ? 'bg-blue-950/80 text-blue-300 border border-blue-700/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Formules Magiques ({sheet.magicFormulas.length})
        </button>
        <button
          onClick={() => setActiveTab('methods')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'methods'
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Méthodes Pas à Pas ({sheet.stepByStepMethods.length})
        </button>
        <button
          onClick={() => setActiveTab('traps')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'traps'
              ? 'bg-red-950/80 text-red-300 border border-red-700/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Pièges d'Examen ({sheet.examTraps.length})
        </button>
      </div>

      {/* 1. SECTION THÉORÈMES */}
      {(activeTab === 'all' || activeTab === 'theorems') && sheet.theorems.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Théorèmes Fondamentaux & Hypothèses Indispensables
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {sheet.theorems.map((thm) => {
              const isHidden = activeRecall && !revealedItems[thm.id];

              return (
                <div
                  key={thm.id}
                  className="rounded-2xl bg-slate-900/90 border border-indigo-950 hover:border-indigo-800/60 p-5 shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-indigo-300">
                      {thm.name}
                    </h3>
                    {activeRecall && (
                      <button
                        onClick={() => toggleReveal(thm.id)}
                        className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-950/50 border border-amber-800/50 px-2 py-0.5 rounded-md"
                      >
                        {isHidden ? 'Révéler' : 'Masquer'}
                      </button>
                    )}
                  </div>

                  {/* Énoncé LaTeX */}
                  <div className="my-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-center">
                    {isHidden ? (
                      <p className="text-xs text-slate-500 italic py-2">
                        [Active Recall : Récitez l'énoncé mathématique de tête, puis cliquez sur Révéler]
                      </p>
                    ) : (
                      <MathView math={thm.statement} block />
                    )}
                  </div>

                  {/* Hypothèses indispensables */}
                  <div className="mt-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      Hypothèses indispensables sans omission (Exigence ESTACA) :
                    </p>
                    {isHidden ? (
                      <p className="text-xs text-slate-600 italic">Hypothèses masquées</p>
                    ) : (
                      <ul className="space-y-1">
                        {thm.strictConditions.map((cond, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-indigo-400 font-bold">•</span>
                            <MathView>{cond}</MathView>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Conseil du Prof */}
                  {thm.professorTip && !isHidden && (
                    <div className="mt-3 p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-200 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-indigo-300 font-semibold">Conseil d'Examen : </strong>
                        <span>{thm.professorTip}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. SECTION FORMULES MAGIQUES */}
      {(activeTab === 'all' || activeTab === 'formulas') && sheet.magicFormulas.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Formules Magiques & Définitions Strictes des Unités SI
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sheet.magicFormulas.map((formula) => {
              const isHidden = activeRecall && !revealedItems[formula.id];

              return (
                <div
                  key={formula.id}
                  className="rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-blue-800/60 p-5 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-blue-300">
                        {formula.name}
                      </h3>
                      {activeRecall && (
                        <button
                          onClick={() => toggleReveal(formula.id)}
                          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-950/50 border border-amber-800/50 px-2 py-0.5 rounded-md"
                        >
                          {isHidden ? 'Révéler' : 'Masquer'}
                        </button>
                      )}
                    </div>

                    {/* Rendu Mathématique de la formule */}
                    <div className="my-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                      {isHidden ? (
                        <p className="text-xs text-slate-500 italic py-2">
                          [Formule masquée pour auto-évaluation]
                        </p>
                      ) : (
                        <MathView math={formula.formula} block />
                      )}
                    </div>

                    {/* Définitions des variables et 100% des unités SI */}
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="font-semibold text-slate-400">Unités SI & Variables : </span>
                        {isHidden ? (
                          <span className="text-slate-600 italic">Masqué</span>
                        ) : (
                          <span className="text-slate-300">
                            <MathView>{formula.unitsAndVariables}</MathView>
                          </span>
                        )}
                      </div>

                      {formula.validityDomain && !isHidden && (
                        <div>
                          <span className="font-semibold text-slate-400">Domaine de validité : </span>
                          <span className="text-slate-300">{formula.validityDomain}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. SECTION MÉTHODES PAS À PAS */}
      {(activeTab === 'all' || activeTab === 'methods') && sheet.stepByStepMethods.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Méthodes de Résolution Type Étape par Étape
            </h2>
          </div>

          <div className="space-y-4">
            {sheet.stepByStepMethods.map((method) => {
              const isHidden = activeRecall && !revealedItems[method.id];

              return (
                <div
                  key={method.id}
                  className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                      <span className="p-1 rounded bg-emerald-500/20 text-emerald-400 text-xs">Objectif</span>
                      {method.goal}
                    </h3>
                    {activeRecall && (
                      <button
                        onClick={() => toggleReveal(method.id)}
                        className="text-xs text-amber-400 hover:text-amber-300 bg-amber-950/50 border border-amber-800/50 px-2 py-0.5 rounded-md"
                      >
                        {isHidden ? 'Révéler les étapes' : 'Masquer'}
                      </button>
                    )}
                  </div>

                  {isHidden ? (
                    <p className="text-xs text-slate-500 italic py-2 bg-slate-950/50 rounded-lg p-3">
                      [Étapes masquées : Quelle est votre démarche complète ? Révélez pour vérifier]
                    </p>
                  ) : (
                    <ol className="space-y-2 mb-3">
                      {method.steps.map((step, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/50">
                          <span className="font-mono text-emerald-400 font-bold">{idx + 1}.</span>
                          <div className="flex-1">
                            <MathView>{step}</MathView>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}

                  {method.trapToAvoid && !isHidden && (
                    <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span><strong>Piège à éviter : </strong>{method.trapToAvoid}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. SECTION PIÈGES D'EXAMEN */}
      {(activeTab === 'all' || activeTab === 'traps') && sheet.examTraps.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Pièges d'Examen et Erreurs Récurrentes (À bannir)
            </h2>
          </div>

          <div className="rounded-2xl bg-red-950/15 border border-red-900/40 p-5 space-y-2.5">
            {sheet.examTraps.map((trap, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-red-200">
                <span className="text-red-400 font-bold shrink-0">⚠️</span>
                <span className="leading-relaxed">
                  <MathView>{trap}</MathView>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. APERÇU ENTRAÎNEMENT FLASHCARDS & QUIZ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-800/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 mb-2">
              <BrainCircuit className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">Cartes Réflexes (Flashcards)</h3>
            </div>
            <p className="text-xs text-slate-400">
              {sheet.flashcards.length} cartes recto/verso pour ancrer les définitions et réflexes de calcul en mémoire à long terme.
            </p>
          </div>
          <button
            onClick={() => onOpenRevision('flashcards')}
            className="mt-4 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-md shadow-indigo-600/30"
          >
            Lancer la session Flashcards
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/60 to-slate-900 border border-purple-800/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <GraduationCap className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">QCM d'Auto-Évaluation Noté</h3>
            </div>
            <p className="text-xs text-slate-400">
              {sheet.quiz.length} questions avec barème, chronométrage et corrections pédagogiques détaillées.
            </p>
          </div>
          <button
            onClick={() => onOpenRevision('quiz')}
            className="mt-4 w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shadow-md shadow-purple-600/30"
          >
            Passer le Quiz Noté
          </button>
        </div>
      </div>
    </div>
  );
};
