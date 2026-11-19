import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, Loader2, Sparkles, AlertTriangle, FileCode } from 'lucide-react';
import { extractTextFromPdf } from '../../services/pdfService';
import { transformLectureToToolbox, parseTdDocument } from '../../services/aiService';
import { AnnaleItem, StudySheet, TDExercise } from '../../types/course';

interface IngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSheetCreated: (sheet: StudySheet) => void;
  onTdCreated: (exercises: TDExercise[]) => void;
  onAnnalesCreated: (annales: AnnaleItem[]) => void;
}

type DestinationType = 'sheet' | 'td' | 'annale';

export const IngestionModal: React.FC<IngestionModalProps> = ({
  isOpen,
  onClose,
  onSheetCreated,
  onTdCreated,
  onAnnalesCreated,
}) => {
  const [targetType, setTargetType] = useState<DestinationType>('sheet');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [pdfPageProgress, setPdfPageProgress] = useState<{ current: number; total: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [pendingTextToProcess, setPendingTextToProcess] = useState<string>('');

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setErrorMessage('Veuillez sélectionner un fichier au format PDF.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
      setSelectedFile(file);
      setErrorMessage(null);
    } else {
      setErrorMessage('Veuillez glisser-déposer un fichier PDF valide.');
    }
  };

  const executeExtraction = async (text: string, forceLocal = false) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setShowConsentDialog(false);

    try {
      if (targetType === 'sheet') {
        setProgressStep(
          forceLocal
            ? 'Génération locale de la fiche...'
            : 'Extraction de la fiche de révision via IA...'
        );
        const newSheet = await transformLectureToToolbox(text, forceLocal);
        onSheetCreated(newSheet);
      } else if (targetType === 'td') {
        setProgressStep(
          forceLocal
            ? 'Découpage local des exercices...'
            : 'Découpage du TD et génération des résolutions...'
        );
        const exercises = (await parseTdDocument(text, 'td', forceLocal)) as TDExercise[];
        onTdCreated(exercises);
      } else {
        setProgressStep(
          forceLocal
            ? "Découpage local de l'annale..."
            : "Découpage de l'annale et barème officiel..."
        );
        const annales = (await parseTdDocument(text, 'annale', forceLocal)) as AnnaleItem[];
        onAnnalesCreated(annales);
      }

      setIsProcessing(false);
      setSelectedFile(null);
      setRawText('');
      onClose();
    } catch (err: any) {
      setIsProcessing(false);
      if (err?.message === 'REQUIRE_USER_CONSENT') {
        setPendingTextToProcess(text);
        setShowConsentDialog(true);
      } else {
        setErrorMessage(err?.message || 'Une erreur inattendue est survenue.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let contentToIngest = rawText.trim();

    if (selectedFile) {
      setIsProcessing(true);
      setProgressStep('Extraction locale du texte PDF...');
      try {
        contentToIngest = await extractTextFromPdf(selectedFile, (current, total) => {
          setPdfPageProgress({ current, total });
        });
        setPdfPageProgress(null);
      } catch (pdfErr: any) {
        setIsProcessing(false);
        setErrorMessage(`Erreur lecture PDF : ${pdfErr.message}`);
        return;
      }
    }

    if (!contentToIngest || contentToIngest.length < 30) {
      setIsProcessing(false);
      setErrorMessage('Le contenu fourni est trop court ou vide pour une extraction exploitable.');
      return;
    }

    await executeExtraction(contentToIngest, false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ingestion de Documents et Cours"
        className="relative w-full max-w-2xl bg-[#0A0E19] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#04060C]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-400/35">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-100">
                Ingestion de Documents & Cours
              </h2>
              <p className="text-xs text-slate-400">
                Traitement PDF local · Extraction en Fiche, TD ou Annale
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Fermer l'ingestion"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {showConsentDialog && (
            <div className="p-4 rounded-xl bg-amber-950/35 border border-amber-400/40 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-amber-300">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h4 className="font-display font-bold text-sm">
                  Services IA temporairement indisponibles
                </h4>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                Les serveurs IA ont retourné une erreur ou aucune clé n'est active. Voulez-vous basculer sur le{' '}
                <strong>Mode Brouillon Local</strong> (extraction Regex 100% hors-ligne) ?
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => executeExtraction(pendingTextToProcess, true)}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#04060C] text-xs font-bold transition-colors"
                >
                  Oui, extraire en Mode Local
                </button>
                <button
                  type="button"
                  onClick={() => setShowConsentDialog(false)}
                  className="px-3 py-2 rounded-lg bg-[#04060C] border border-white/[0.1] hover:bg-[#101625] text-slate-300 text-xs font-medium transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          <div>
            <span className="block text-xs font-semibold text-slate-300 mb-2">
              Destination de la transformation
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setTargetType('sheet')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-colors ${
                  targetType === 'sheet'
                    ? 'bg-[#101625] border-amber-400/50 text-white'
                    : 'bg-[#04060C] border-white/[0.08] text-slate-400 hover:text-slate-100'
                }`}
              >
                <FileText className="w-5 h-5 mb-1.5 text-amber-400" />
                <span className="text-xs font-semibold">Fiche de Cours</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Théorèmes, formules & quiz</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('td')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-colors ${
                  targetType === 'td'
                    ? 'bg-[#101625] border-sky-400/50 text-white'
                    : 'bg-[#04060C] border-white/[0.08] text-slate-400 hover:text-slate-100'
                }`}
              >
                <FileCode className="w-5 h-5 mb-1.5 text-sky-400" />
                <span className="text-xs font-semibold">Feuille de TD</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Exercices & corrections</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('annale')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-colors ${
                  targetType === 'annale'
                    ? 'bg-[#101625] border-emerald-400/50 text-white'
                    : 'bg-[#04060C] border-white/[0.08] text-slate-400 hover:text-slate-100'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 mb-1.5 text-emerald-400" />
                <span className="text-xs font-semibold">Annale d'Examen</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Barème & chronomètre</span>
              </button>
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-300 mb-2">
              Fichier PDF du polycopié ou sujet
            </span>
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className={`border border-dashed rounded-xl p-5 text-center transition-colors ${
                selectedFile
                  ? 'border-amber-400/60 bg-amber-500/5'
                  : 'border-white/[0.15] bg-[#04060C] hover:border-amber-400/40'
              }`}
            >
              <input
                type="file"
                accept=".pdf,application/pdf"
                id="pdfUpload"
                className="hidden"
                onChange={handleFileSelect}
              />
              <label htmlFor="pdfUpload" className="cursor-pointer block">
                <UploadCloud className="w-7 h-7 mx-auto text-amber-400 mb-2 opacity-90" />
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-semibold text-white">{selectedFile.name}</p>
                    <p className="text-xs text-amber-300 mt-0.5 font-mono">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo · Prêt pour extraction
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Glissez votre PDF ici ou <span className="text-amber-400 underline">parcourir</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Lecture 100% locale dans votre navigateur
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.08]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0A0E19] px-3 text-slate-400 font-medium">
                Ou collez le texte brut
              </span>
            </div>
          </div>

          <div>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              aria-label="Texte brut du cours ou des exercices"
              placeholder="Collez ici les formules, énoncés, cours ou exercices (syntaxe LaTeX $...$ supportée)..."
              rows={4}
              className="w-full rounded-xl bg-[#04060C] border border-white/[0.1] p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400/60 transition-colors font-mono"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isProcessing && (
            <div className="p-4 rounded-xl bg-[#04060C] border border-amber-400/35 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">{progressStep}</p>
                {pdfPageProgress && (
                  <p className="text-[11px] text-amber-300 font-mono">
                    Analyse page {pdfPageProgress.current} sur {pdfPageProgress.total}...
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
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl bg-[#0A0E19] hover:bg-[#101625] border border-white/[0.1] text-slate-200 text-xs font-semibold transition-colors"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing || (!selectedFile && !rawText.trim())}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-[#04060C] text-xs font-bold transition-colors"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Transformation en cours...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Lancer la transformation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
