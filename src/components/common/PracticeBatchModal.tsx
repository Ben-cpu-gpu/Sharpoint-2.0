import React, { useEffect, useRef, useState } from 'react';
import { X, Sparkles, Loader2, AlertTriangle, Zap, BookOpen } from 'lucide-react';
import { AnnaleItem, StudySheet, TDExercise } from '../../types/course';
import { availableSubjects } from '../../data/initialData';
import { resolveSubjectId } from '../../utils/courseCatalog';
import { AIExtractionProgress, generatePracticeBatch } from '../../services/aiService';

interface PracticeBatchModalProps {
  isOpen: boolean;
  initialType: 'td' | 'annale';
  defaultSubjectId?: string | 'all';
  sheets: StudySheet[];
  onClose: () => void;
  onExercisesCreated: (exercises: TDExercise[]) => void;
  onAnnalesCreated: (annales: AnnaleItem[]) => void;
}

export const PracticeBatchModal: React.FC<PracticeBatchModalProps> = ({
  isOpen,
  initialType,
  defaultSubjectId,
  sheets,
  onClose,
  onExercisesCreated,
  onAnnalesCreated,
}) => {
  const validSubjectIds = availableSubjects.map(s => s.id);
  const [targetType, setTargetType] = useState<'td' | 'annale'>(initialType);
  const [subjectId, setSubjectId] = useState<string>(() =>
    resolveSubjectId(defaultSubjectId, validSubjectIds)
  );
  const [count, setCount] = useState<number>(4);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 'mixed'>('mixed');
  const [topicPrompt, setTopicPrompt] = useState('');
  const [selectedSheetId, setSelectedSheetId] = useState<string>('none');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<AIExtractionProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLocalConsent, setShowLocalConsent] = useState(false);
  const [consentDetails, setConsentDetails] = useState<string[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetType(initialType);
      setSubjectId(resolveSubjectId(defaultSubjectId, availableSubjects.map(s => s.id)));
      setErrorMessage(null);
      setShowLocalConsent(false);
      setProgress(null);
    }
  }, [isOpen, initialType, defaultSubjectId]);

  if (!isOpen) return null;

  const subjectSheets = sheets.filter(s => s.subjectId === subjectId);
  const activeSubjectName =
    availableSubjects.find(s => s.id === subjectId)?.name || 'Ingénierie ESTACA';
  const sourceSheet = sheets.find(s => s.id === selectedSheetId);

  const runGeneration = async (forceLocal = false) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);
    setErrorMessage(null);
    setShowLocalConsent(false);
    setProgress(null);

    try {
      const results = await generatePracticeBatch({
        type: targetType,
        count,
        subjectId,
        subjectName: activeSubjectName,
        difficulty,
        topicPrompt,
        sourceSheet,
        forceLocal,
        onProgress: prog => setProgress(prog),
        signal: controller.signal,
      });

      if (targetType === 'td') {
        onExercisesCreated(results as TDExercise[]);
      } else {
        onAnnalesCreated(results as AnnaleItem[]);
      }
      onClose();
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        setErrorMessage('Génération annulée.');
      } else if (err?.message === 'REQUIRE_USER_CONSENT') {
        setConsentDetails(Array.isArray(err?.details) ? err.details : []);
        setShowLocalConsent(true);
      } else {
        setErrorMessage(err?.message || 'Erreur lors de la génération du pack.');
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-modal-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Générateur d'exercices et d'annales IA"
        className="relative w-full max-w-xl bg-[#0A0E19] border border-sky-400/35 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-modal-panel"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#04060C]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-400/35 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-slate-100 truncate">
                Générateur Multi-Exercices &amp; Annales
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Routage rapide fiable (Gemini Flash-Lite / Flash + Relais) · Corrections &amp; explications incluses
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              abortRef.current?.abort();
              onClose();
            }}
            aria-label="Fermer le générateur"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {showLocalConsent && (
            <div className="p-4 rounded-xl bg-amber-950/35 border border-amber-400/40 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-amber-300 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Les IA cloud sont indisponibles ou sans clé configurée</span>
              </div>
              <p className="text-slate-200 leading-relaxed">
                Souhaitez-vous générer un pack d&apos;entraînement structuré en <strong>Mode Local</strong> à partir de votre fiche sélectionnée ?
              </p>
              {consentDetails.length > 0 && (
                <p className="text-[11px] font-mono text-amber-200/80 truncate">
                  {consentDetails[0]}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => runGeneration(true)}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#04060C] font-bold"
                >
                  Oui, générer en Mode Local
                </button>
                <button
                  type="button"
                  onClick={() => setShowLocalConsent(false)}
                  className="px-3 py-2 rounded-lg bg-[#04060C] border border-white/[0.1] text-slate-300"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Type switch */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setTargetType('td')}
              className={`p-3 rounded-xl border text-left transition-colors ${
                targetType === 'td'
                  ? 'bg-[#101C2E] border-sky-400 text-white'
                  : 'bg-[#04060C] border-white/[0.08] text-slate-400 hover:text-slate-100'
              }`}
            >
              <div className="font-semibold text-xs">Pack Exercices TD</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Indices progressifs + corrigé pas à pas</div>
            </button>
            <button
              type="button"
              onClick={() => setTargetType('annale')}
              className={`p-3 rounded-xl border text-left transition-colors ${
                targetType === 'annale'
                  ? 'bg-[#0F2320] border-emerald-400 text-white'
                  : 'bg-[#04060C] border-white/[0.08] text-slate-400 hover:text-slate-100'
              }`}
            >
              <div className="font-semibold text-xs">Pack Annales d&apos;Examen</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Barème ESTACA + durée + explications</div>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="batchSubject" className="block font-semibold text-slate-300 mb-1.5">
                Matière
              </label>
              <select
                id="batchSubject"
                value={subjectId}
                onChange={e => {
                  setSubjectId(e.target.value);
                  setSelectedSheetId('none');
                }}
                className="w-full rounded-xl bg-[#04060C] border border-white/[0.1] px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-400/60"
              >
                {availableSubjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="batchCount" className="block font-semibold text-slate-300 mb-1.5">
                Nombre à générer
              </label>
              <select
                id="batchCount"
                value={count}
                onChange={e => setCount(Number(e.target.value))}
                className="w-full rounded-xl bg-[#04060C] border border-white/[0.1] px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-400/60"
              >
                {[2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>
                    {n} {targetType === 'annale' ? 'annales corrigées' : 'exercices corrigés'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="batchSheet" className="block font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Appuyer sur une fiche de cours existante (recommandé)</span>
            </label>
            <select
              id="batchSheet"
              value={selectedSheetId}
              onChange={e => setSelectedSheetId(e.target.value)}
              className="w-full rounded-xl bg-[#04060C] border border-white/[0.1] px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-400/60"
            >
              <option value="none">Programme canonique général ({activeSubjectName})</option>
              {subjectSheets.map(sh => (
                <option key={sh.id} value={sh.id}>
                  {sh.title} ({sh.theorems.length} théorèmes, {sh.magicFormulas.length} formules)
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block font-semibold text-slate-300 mb-1.5">Niveau de difficulté</span>
            <div className="flex flex-wrap gap-2">
              {(['mixed', 1, 2, 3] as const).map(d => (
                <button
                  key={String(d)}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                    difficulty === d
                      ? 'bg-sky-500 text-[#04060C] border-sky-400'
                      : 'bg-[#04060C] text-slate-300 border-white/[0.08] hover:text-white'
                  }`}
                >
                  {d === 'mixed' && 'Progressif (1 → 3)'}
                  {d === 1 && 'Niveau 1 (Bases)'}
                  {d === 2 && 'Niveau 2 (Classique)'}
                  {d === 3 && 'Niveau 3 (ESTACA)'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="batchTopic" className="block font-semibold text-slate-300 mb-1.5">
              Thème ciblé ou notions à travailler (optionnel)
            </label>
            <input
              id="batchTopic"
              type="text"
              value={topicPrompt}
              onChange={e => setTopicPrompt(e.target.value)}
              placeholder="Ex: Théorème de Bernoulli, pertes de charge, tuyère de Laval..."
              className="w-full rounded-xl bg-[#04060C] border border-white/[0.1] px-3.5 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400/60"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isGenerating && (
            <div className="p-3.5 rounded-xl bg-[#04060C] border border-sky-400/35 flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-slate-100 truncate">
                  {progress?.stepLabel || 'Génération via modèle rapide fiable (Flash-Lite / Flash)...'}
                </p>
                {progress?.model && (
                  <p className="text-[11px] font-mono text-sky-300">
                    {progress.provider} · {progress.model} ({progress.aiPct}%)
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/[0.08] bg-[#04060C] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              abortRef.current?.abort();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-[#0A0E19] hover:bg-[#101625] border border-white/[0.1] text-slate-200 text-xs font-semibold transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => runGeneration(false)}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-[#04060C] text-xs font-bold transition-colors cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Génération en cours...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  Générer {count} {targetType === 'annale' ? 'annales' : 'exercices'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
