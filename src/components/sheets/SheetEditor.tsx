import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Plus, Trash2, HelpCircle } from 'lucide-react';
import { StudySheet, TheoremItem, MagicFormula, StepByStepMethod, Flashcard, QuizQuestion } from '../../types/course';
import { MathView } from '../common/MathView';

interface SheetEditorProps {
  sheet: StudySheet;
  onSave: (updated: StudySheet) => void;
  onCancel: () => void;
}

export const SheetEditor: React.FC<SheetEditorProps> = ({ sheet, onSave, onCancel }) => {
  const [formData, setFormData] = useState<StudySheet>({ ...sheet });
  const [activeTab, setActiveTab] = useState<'info' | 'theorems' | 'formulas' | 'methods' | 'traps' | 'flashcards' | 'quiz'>('info');

  // Raccourci clavier Ctrl+S / Cmd+S pour sauvegarder immédiatement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave(formData);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, onSave]);

  const addTheorem = () => {
    const newThm: TheoremItem = {
      id: `thm_${Date.now()}`,
      name: 'Nouveau Théorème',
      statement: 'A + B = C',
      strictConditions: ['Hypothèse 1'],
      professorTip: '',
    };
    setFormData({ ...formData, theorems: [...formData.theorems, newThm] });
  };

  const removeTheorem = (id: string) => {
    setFormData({ ...formData, theorems: formData.theorems.filter(t => t.id !== id) });
  };

  const addFormula = () => {
    const newFml: MagicFormula = {
      id: `fml_${Date.now()}`,
      name: 'Nouvelle Formule',
      formula: 'E = m c^2',
      unitsAndVariables: 'E en Joules [J], m en kg, c en m/s',
      validityDomain: 'Relativité restreinte',
    };
    setFormData({ ...formData, magicFormulas: [...formData.magicFormulas, newFml] });
  };

  const removeFormula = (id: string) => {
    setFormData({ ...formData, magicFormulas: formData.magicFormulas.filter(f => f.id !== id) });
  };

  const addMethod = () => {
    const newMth: StepByStepMethod = {
      id: `mth_${Date.now()}`,
      goal: 'Résolution type',
      steps: ['Étape 1 : Hypothèses', 'Étape 2 : Bilan'],
      trapToAvoid: '',
    };
    setFormData({ ...formData, stepByStepMethods: [...formData.stepByStepMethods, newMth] });
  };

  const removeMethod = (id: string) => {
    setFormData({ ...formData, stepByStepMethods: formData.stepByStepMethods.filter(m => m.id !== id) });
  };

  const addTrap = () => {
    setFormData({ ...formData, examTraps: [...formData.examTraps, 'Nouveau piège d\'examen'] });
  };

  const removeTrap = (index: number) => {
    const updated = [...formData.examTraps];
    updated.splice(index, 1);
    setFormData({ ...formData, examTraps: updated });
  };

  const addFlashcard = () => {
    const newFc: Flashcard = {
      id: `fc_${Date.now()}`,
      question: 'Question réflexe ?',
      answer: 'Réponse exacte.',
    };
    setFormData({ ...formData, flashcards: [...formData.flashcards, newFc] });
  };

  const removeFlashcard = (id: string) => {
    setFormData({ ...formData, flashcards: formData.flashcards.filter(fc => fc.id !== id) });
  };

  const addQuizQuestion = () => {
    const newQz: QuizQuestion = {
      id: `qz_${Date.now()}`,
      question: 'Question QCM ?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: 0,
      explanation: 'Explication détaillée du calcul.',
    };
    setFormData({ ...formData, quiz: [...formData.quiz, newQz] });
  };

  const removeQuizQuestion = (id: string) => {
    setFormData({ ...formData, quiz: formData.quiz.filter(q => q.id !== id) });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Barre supérieure d'actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Annuler sans sauver</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-slate-500 font-mono">
            Raccourci: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">S</kbd>
          </span>
          <button
            onClick={() => onSave(formData)}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer la fiche</span>
          </button>
        </div>
      </div>

      {/* Onglets de sections de l'éditeur */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(['info', 'theorems', 'formulas', 'methods', 'traps', 'flashcards', 'quiz'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'info' && 'Général'}
            {tab === 'theorems' && `Théorèmes (${formData.theorems.length})`}
            {tab === 'formulas' && `Formules (${formData.magicFormulas.length})`}
            {tab === 'methods' && `Méthodes (${formData.stepByStepMethods.length})`}
            {tab === 'traps' && `Pièges (${formData.examTraps.length})`}
            {tab === 'flashcards' && `Flashcards (${formData.flashcards.length})`}
            {tab === 'quiz' && `Quiz (${formData.quiz.length})`}
          </button>
        ))}
      </div>

      {/* 1. INFORMATIONS GÉNÉRALES */}
      {activeTab === 'info' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Informations de la Fiche
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Titre de la fiche</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Sous-titre / Description</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Chapitre</label>
                <input
                  type="text"
                  value={formData.chapter}
                  onChange={e => setFormData({ ...formData, chapter: e.target.value })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Tags (séparés par virgules)</label>
                <input
                  type="text"
                  value={formData.tags.join(', ')}
                  onChange={e => setFormData({ ...formData, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. THÉORÈMES */}
      {activeTab === 'theorems' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Théorèmes & Hypothèses</h2>
            <button
              onClick={addTheorem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter un théorème
            </button>
          </div>

          {formData.theorems.map((thm, idx) => (
            <div key={thm.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={thm.name}
                  onChange={e => {
                    const updated = [...formData.theorems];
                    updated[idx].name = e.target.value;
                    setFormData({ ...formData, theorems: updated });
                  }}
                  className="font-bold text-sm bg-transparent border-b border-slate-700 text-indigo-300 focus:outline-none focus:border-indigo-500 pb-1"
                />
                <button
                  onClick={() => removeTheorem(thm.id)}
                  className="text-slate-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Énoncé Mathématique (LaTeX)</label>
                <textarea
                  value={thm.statement}
                  onChange={e => {
                    const updated = [...formData.theorems];
                    updated[idx].statement = e.target.value;
                    setFormData({ ...formData, theorems: updated });
                  }}
                  rows={2}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                <div className="mt-1 p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 block text-left mb-1">Aperçu direct :</span>
                  <MathView math={thm.statement} block />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Hypothèses strictes (1 par ligne)</label>
                <textarea
                  value={thm.strictConditions.join('\n')}
                  onChange={e => {
                    const updated = [...formData.theorems];
                    updated[idx].strictConditions = e.target.value.split('\n').filter(Boolean);
                    setFormData({ ...formData, theorems: updated });
                  }}
                  rows={3}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Conseil d'Examen du Prof</label>
                <input
                  type="text"
                  value={thm.professorTip || ''}
                  onChange={e => {
                    const updated = [...formData.theorems];
                    updated[idx].professorTip = e.target.value;
                    setFormData({ ...formData, theorems: updated });
                  }}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. FORMULES MAGIQUES */}
      {activeTab === 'formulas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Formules Magiques & Unités SI</h2>
            <button
              onClick={addFormula}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter une formule
            </button>
          </div>

          {formData.magicFormulas.map((fml, idx) => (
            <div key={fml.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={fml.name}
                  onChange={e => {
                    const updated = [...formData.magicFormulas];
                    updated[idx].name = e.target.value;
                    setFormData({ ...formData, magicFormulas: updated });
                  }}
                  className="font-bold text-sm bg-transparent border-b border-slate-700 text-blue-300 focus:outline-none focus:border-indigo-500 pb-1"
                />
                <button
                  onClick={() => removeFormula(fml.id)}
                  className="text-slate-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Formule (LaTeX)</label>
                <input
                  type="text"
                  value={fml.formula}
                  onChange={e => {
                    const updated = [...formData.magicFormulas];
                    updated[idx].formula = e.target.value;
                    setFormData({ ...formData, magicFormulas: updated });
                  }}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                <div className="mt-1 p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
                  <MathView math={fml.formula} block />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Définitions des variables & Unités SI</label>
                <textarea
                  value={fml.unitsAndVariables}
                  onChange={e => {
                    const updated = [...formData.magicFormulas];
                    updated[idx].unitsAndVariables = e.target.value;
                    setFormData({ ...formData, magicFormulas: updated });
                  }}
                  rows={2}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Domaine de validité</label>
                <input
                  type="text"
                  value={fml.validityDomain}
                  onChange={e => {
                    const updated = [...formData.magicFormulas];
                    updated[idx].validityDomain = e.target.value;
                    setFormData({ ...formData, magicFormulas: updated });
                  }}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. MÉTHODES PAS À PAS */}
      {activeTab === 'methods' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Méthodes Pas à Pas</h2>
            <button
              onClick={addMethod}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter une méthode
            </button>
          </div>

          {formData.stepByStepMethods.map((mth, idx) => (
            <div key={mth.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={mth.goal}
                  onChange={e => {
                    const updated = [...formData.stepByStepMethods];
                    updated[idx].goal = e.target.value;
                    setFormData({ ...formData, stepByStepMethods: updated });
                  }}
                  className="font-bold text-sm bg-transparent border-b border-slate-700 text-emerald-300 focus:outline-none focus:border-indigo-500 pb-1"
                />
                <button
                  onClick={() => removeMethod(mth.id)}
                  className="text-slate-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Étapes (1 par ligne)</label>
                <textarea
                  value={mth.steps.join('\n')}
                  onChange={e => {
                    const updated = [...formData.stepByStepMethods];
                    updated[idx].steps = e.target.value.split('\n').filter(Boolean);
                    setFormData({ ...formData, stepByStepMethods: updated });
                  }}
                  rows={4}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Piège à éviter</label>
                <input
                  type="text"
                  value={mth.trapToAvoid || ''}
                  onChange={e => {
                    const updated = [...formData.stepByStepMethods];
                    updated[idx].trapToAvoid = e.target.value;
                    setFormData({ ...formData, stepByStepMethods: updated });
                  }}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. PIÈGES D'EXAMEN */}
      {activeTab === 'traps' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Pièges d'Examen</h2>
            <button
              onClick={addTrap}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter un piège
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            {formData.examTraps.map((trap, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={trap}
                  onChange={e => {
                    const updated = [...formData.examTraps];
                    updated[idx] = e.target.value;
                    setFormData({ ...formData, examTraps: updated });
                  }}
                  className="flex-1 rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => removeTrap(idx)}
                  className="text-slate-500 hover:text-red-400 p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. FLASHCARDS */}
      {activeTab === 'flashcards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Cartes Réflexes (Flashcards)</h2>
            <button
              onClick={addFlashcard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter une flashcard
            </button>
          </div>

          {formData.flashcards.map((fc, idx) => (
            <div key={fc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400">Flashcard #{idx + 1}</span>
                <button
                  onClick={() => removeFlashcard(fc.id)}
                  className="text-slate-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Question (Recto)</label>
                <input
                  type="text"
                  value={fc.question}
                  onChange={e => {
                    const updated = [...formData.flashcards];
                    updated[idx].question = e.target.value;
                    setFormData({ ...formData, flashcards: updated });
                  }}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Réponse (Verso)</label>
                <textarea
                  value={fc.answer}
                  onChange={e => {
                    const updated = [...formData.flashcards];
                    updated[idx].answer = e.target.value;
                    setFormData({ ...formData, flashcards: updated });
                  }}
                  rows={2}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 7. QUIZ */}
      {activeTab === 'quiz' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Quiz QCM</h2>
            <button
              onClick={addQuizQuestion}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter une question
            </button>
          </div>

          {formData.quiz.map((q, idx) => (
            <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400">Question #{idx + 1}</span>
                <button
                  onClick={() => removeQuizQuestion(q.id)}
                  className="text-slate-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Énoncé de la question</label>
                <input
                  type="text"
                  value={q.question}
                  onChange={e => {
                    const updated = [...formData.quiz];
                    updated[idx].question = e.target.value;
                    setFormData({ ...formData, quiz: updated });
                  }}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-slate-400">Options (cochez la bonne réponse)</label>
                {q.options.map((opt, optIdx) => (
                  <div key={optIdx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct_${q.id}`}
                      checked={q.correctIndex === optIdx}
                      onChange={() => {
                        const updated = [...formData.quiz];
                        updated[idx].correctIndex = optIdx;
                        setFormData({ ...formData, quiz: updated });
                      }}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={e => {
                        const updated = [...formData.quiz];
                        const newOptions = [...updated[idx].options] as [string, string, string, string];
                        newOptions[optIdx] = e.target.value;
                        updated[idx].options = newOptions;
                        setFormData({ ...formData, quiz: updated });
                      }}
                      className="flex-1 rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Explication détaillée</label>
                <textarea
                  value={q.explanation}
                  onChange={e => {
                    const updated = [...formData.quiz];
                    updated[idx].explanation = e.target.value;
                    setFormData({ ...formData, quiz: updated });
                  }}
                  rows={2}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
