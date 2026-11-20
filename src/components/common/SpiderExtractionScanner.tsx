import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  Sparkles,
  ShieldCheck,
  Cpu,
  Eye,
  FileText,
  CheckCircle2,
  X,
  ArrowRight,
  Table2,
} from 'lucide-react';
import {
  analyzeDocumentText,
  computeExtractionProgress,
  countStreamedJsonSignals,
} from '../../utils/pdfTelemetry';
import { PdfBlockCategory, PdfDetectedBox, PdfScannedPage } from '../../utils/documentExtraction';
import { AIExtractionProgress } from '../../services/aiService';

interface SpiderExtractionScannerProps {
  isOpen: boolean;
  fileName?: string;
  targetType: 'sheet' | 'td' | 'annale';
  progressStep: string;
  hasPdfFile: boolean;
  pdfProgress?: { current: number; total: number; done: boolean } | null;
  scannedPages?: PdfScannedPage[];
  aiProgress?: AIExtractionProgress | null;
  liveText?: string;
  forceLocalMode?: boolean;
  isComplete?: boolean;
  completionSummary?: string;
  onCancel?: () => void;
  onFinishTransition?: () => void;
}

const CATEGORY_STYLES: Record<
  PdfBlockCategory,
  { border: string; activeBg: string; badge: string; label: string }
> = {
  formula: {
    border: 'border-amber-400/75',
    activeBg: 'bg-amber-400/28 shadow-[0_0_16px_rgba(245,158,11,0.45)]',
    badge: 'bg-amber-500 text-[#04060C]',
    label: 'Formule',
  },
  theorem: {
    border: 'border-sky-400/75',
    activeBg: 'bg-sky-400/25 shadow-[0_0_16px_rgba(56,189,248,0.45)]',
    badge: 'bg-sky-400 text-[#04060C]',
    label: 'Théorème',
  },
  definition: {
    border: 'border-emerald-400/75',
    activeBg: 'bg-emerald-400/22 shadow-[0_0_14px_rgba(16,185,129,0.4)]',
    badge: 'bg-emerald-400 text-[#04060C]',
    label: 'Définition',
  },
  table: {
    border: 'border-violet-400/75',
    activeBg: 'bg-violet-400/25 shadow-[0_0_14px_rgba(167,139,250,0.45)]',
    badge: 'bg-violet-400 text-[#04060C]',
    label: 'Tableau',
  },
  text: {
    border: 'border-slate-400/35',
    activeBg: 'bg-slate-400/18',
    badge: 'bg-slate-300 text-[#04060C]',
    label: 'Texte',
  },
};

export const SpiderExtractionScanner: React.FC<SpiderExtractionScannerProps> = ({
  isOpen,
  fileName,
  targetType,
  progressStep,
  hasPdfFile,
  pdfProgress,
  scannedPages = [],
  aiProgress,
  liveText,
  forceLocalMode,
  isComplete = false,
  completionSummary,
  onCancel,
  onFinishTransition,
}) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [selectedPageNum, setSelectedPageNum] = useState<number | null>(null);
  const prevPosRef = useRef<{ x: number; y: number }>({ x: 50, y: 18 });

  const docStats = useMemo(() => analyzeDocumentText(liveText || ''), [liveText]);
  const aiStats = useMemo(
    () => countStreamedJsonSignals(aiProgress?.streamedText || ''),
    [aiProgress?.streamedText]
  );

  // Compteurs réels depuis les boîtes PDF géométriques lorsqu'elles sont disponibles
  const boxCounts = useMemo(() => {
    let formulas = 0;
    let theorems = 0;
    let definitions = 0;
    let tables = 0;
    for (const p of scannedPages) {
      for (const b of p.boxes) {
        if (b.category === 'formula') formulas++;
        else if (b.category === 'theorem') theorems++;
        else if (b.category === 'definition') definitions++;
        else if (b.category === 'table') tables++;
      }
    }
    return { formulas, theorems, definitions, tables };
  }, [scannedPages]);

  const realCounts = useMemo(
    () => ({
      formulas: Math.max(boxCounts.formulas, docStats.formulas, aiStats.formulas),
      theorems: Math.max(boxCounts.theorems, docStats.theorems, aiStats.theorems),
      definitions: Math.max(boxCounts.definitions, docStats.definitions, aiStats.definitions),
      tables: boxCounts.tables,
      blocks: Math.max(scannedPages.length, docStats.blocks, aiStats.blocks),
    }),
    [boxCounts, docStats, aiStats, scannedPages.length]
  );

  const progress = useMemo(
    () =>
      computeExtractionProgress({
        hasPdfFile,
        pdfCurrentPage: pdfProgress?.current ?? 0,
        pdfTotalPages: pdfProgress?.total ?? 0,
        pdfDone: Boolean(pdfProgress?.done),
        aiPct: isComplete
          ? 100
          : aiProgress?.aiPct ??
            (hasPdfFile && !pdfProgress?.done ? 0 : forceLocalMode ? 65 : 10),
        isDone: isComplete || aiProgress?.aiPct === 100,
      }),
    [hasPdfFile, pdfProgress, aiProgress?.aiPct, forceLocalMode, isComplete]
  );

  // Page PDF actuellement inspectée (suit automatiquement la dernière page scannée pendant la lecture, ou cycle doucement pendant la phase IA)
  useEffect(() => {
    if (!isOpen) {
      setStepIdx(0);
      setSelectedPageNum(null);
      prevPosRef.current = { x: 50, y: 18 };
      return;
    }

    const interval = setInterval(() => {
      setStepIdx(prev => prev + 1);
    }, 620);

    return () => clearInterval(interval);
  }, [isOpen]);

  const activePage: PdfScannedPage | undefined = useMemo(() => {
    if (scannedPages.length === 0) return undefined;
    if (selectedPageNum !== null) {
      const explicit = scannedPages.find(p => p.pageNum === selectedPageNum);
      if (explicit) return explicit;
    }
    // Pendant la lecture PDF, montre la page la plus récente en cours d'extraction
    if (!pdfProgress?.done) {
      return scannedPages[scannedPages.length - 1];
    }
    // Une fois le PDF lu, balaye les pages contenant le plus d'éléments ou la page 1
    const pagesWithBoxes = scannedPages.filter(p => p.boxes.length > 0);
    if (pagesWithBoxes.length === 0) return scannedPages[0];
    const pageCycleIdx = Math.floor(stepIdx / 8) % pagesWithBoxes.length;
    return pagesWithBoxes[pageCycleIdx];
  }, [scannedPages, selectedPageNum, pdfProgress?.done, stepIdx]);

  const activeBoxes = activePage?.boxes || [];
  const activeBoxIdx = activeBoxes.length > 0 ? stepIdx % activeBoxes.length : -1;
  const activeBox: PdfDetectedBox | undefined =
    activeBoxIdx >= 0 ? activeBoxes[activeBoxIdx] : undefined;

  const previewLines = docStats.previewLines;
  const activeLineIdx = previewLines.length > 0 ? stepIdx % previewLines.length : 0;

  // Coordonnées cibles réelles de l'araignée (en % de la surface)
  let targetX = 50;
  let targetY = 46;
  if (activeBox) {
    targetX = Math.max(8, Math.min(92, activeBox.xPct + Math.min(activeBox.wPct * 0.72, 42)));
    targetY = Math.max(7, Math.min(92, activeBox.yPct + activeBox.hPct * 0.5));
  } else if (previewLines.length > 0) {
    const rowCount = Math.max(1, previewLines.length);
    targetX = 82 + ((stepIdx % 2 === 0 ? 1 : -1) * 5);
    targetY = Math.round(14 + ((activeLineIdx + 0.5) / rowCount) * 74);
  }

  const dx = targetX - prevPosRef.current.x;
  const dy = targetY - prevPosRef.current.y;
  const tiltDeg =
    Math.abs(dx) + Math.abs(dy) < 1
      ? 0
      : Math.max(-28, Math.min(28, Math.round(Math.atan2(dx, Math.max(8, Math.abs(dy))) * (180 / Math.PI) * 0.45)));

  useEffect(() => {
    prevPosRef.current = { x: targetX, y: targetY };
  }, [targetX, targetY]);

  if (!isOpen) return null;

  const streamedLower = (aiProgress?.streamedText || '').toLowerCase();

  const getTargetTitle = () => {
    if (targetType === 'sheet') return 'Extraction de Fiche de Cours & Théorèmes';
    if (targetType === 'td') return 'Découpage et Résolution de Feuille de TD';
    return 'Analyse d’Annale d’Examen & Barème Officiel';
  };

  const pdfStatusLabel = hasPdfFile
    ? pdfProgress?.done
      ? `Lecture PDF terminée (${pdfProgress.total} page${pdfProgress.total > 1 ? 's' : ''})`
      : pdfProgress && pdfProgress.total > 0
      ? `Page ${pdfProgress.current} / ${pdfProgress.total}`
      : 'Ouverture du PDF...'
    : 'Texte source prêt';

  const aiStatusLabel = isComplete
    ? completionSummary || 'Extraction terminée avec succès !'
    : aiProgress?.stepLabel ||
      (hasPdfFile && !pdfProgress?.done
        ? 'Lecture géométrique des blocs PDF en direct...'
        : progressStep || 'Initialisation du routeur IA...');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 animate-fade-in">
      <div
        role="status"
        aria-live="polite"
        aria-label="Analyse du document en temps réel"
        data-testid="spider-extraction-scanner"
        className="relative w-full max-w-5xl bg-[#0A0E19] border border-amber-500/35 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-[#04060C]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/40 shrink-0">
              {isComplete ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Cpu className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-sm md:text-base font-bold text-slate-100 flex flex-wrap items-center gap-2">
                <span className="truncate">{getTargetTitle()}</span>
                <span className="px-2 py-0.5 text-[10px] rounded-md bg-amber-500/15 text-amber-300 border border-amber-400/30 font-mono">
                  {aiProgress?.provider
                    ? `${aiProgress.provider} · ${aiProgress.model}`
                    : 'Scan Visuel Temps Réel'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {fileName ? `Fichier : ${fileName}` : 'Analyse directe du texte fourni'}
                {docStats.charCount > 0 ? ` · ${docStats.charCount.toLocaleString('fr-FR')} caractères extraits` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right font-mono">
              <div className="text-base sm:text-lg font-bold text-amber-400">{progress.globalPct}%</div>
              <div className="text-[10px] text-slate-400">Progression réelle</div>
            </div>
            {!isComplete && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/70 border border-rose-500/40 text-rose-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Annuler</span>
              </button>
            )}
          </div>
        </div>

        {/* Real Multi-Stage Progress Bars Strip */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#070B14] border-b border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-sky-300 font-semibold">1. Lecture PDF : {pdfStatusLabel}</span>
              <span className="text-sky-400 font-bold">{progress.pdfPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${progress.pdfPct}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-amber-300 font-semibold truncate pr-2">
                2. Structuration IA
                {aiProgress?.bytesReceived
                  ? ` (${aiProgress.bytesReceived.toLocaleString('fr-FR')} car.)`
                  : ''}
              </span>
              <span className="text-amber-400 font-bold shrink-0">{progress.aiPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${progress.aiPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Completion Transition Banner */}
        {isComplete && (
          <div className="px-4 sm:px-6 py-3 bg-emerald-950/60 border-b border-emerald-400/40 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5 text-emerald-200 text-xs sm:text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{completionSummary || 'Document structuré avec succès ! Ouverture du résultat...'}</span>
            </div>
            {onFinishTransition && (
              <button
                type="button"
                onClick={onFinishTransition}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#04060C] text-xs font-bold transition-colors cursor-pointer"
              >
                <span>Ouvrir maintenant</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Main Content Area: Real PDF Page Preview + Coordinate Overlay + Robotic Spider */}
        <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-y-auto md:overflow-hidden min-h-0">
          {/* Document Preview Box (2 Cols) */}
          <div className="md:col-span-2 relative bg-[#04060C]/90 p-3 sm:p-4 overflow-y-auto border-b md:border-b-0 md:border-r border-white/[0.08] flex flex-col justify-between font-mono text-xs min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-white/[0.06] text-slate-400 text-[11px]">
              <span className="flex items-center gap-1.5 text-amber-300">
                <FileText className="w-3.5 h-3.5" />
                {activePage
                  ? `Page ${activePage.pageNum}/${activePage.totalPages} · ${activePage.boxes.length} zones repérées`
                  : pdfStatusLabel}
              </span>

              {scannedPages.length > 1 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {scannedPages.slice(0, 8).map(p => {
                    const isActive = activePage?.pageNum === p.pageNum;
                    return (
                      <button
                        key={p.pageNum}
                        type="button"
                        onClick={() => setSelectedPageNum(p.pageNum)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          isActive
                            ? 'bg-amber-500 text-[#04060C] font-bold'
                            : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.12]'
                        }`}
                      >
                        P.{p.pageNum}
                      </button>
                    );
                  })}
                </div>
              )}

              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Coordonnées réelles
              </span>
            </div>

            {/* Real PDF Page Surface OR Fallback Text Stream */}
            {activePage && activePage.previewUrl ? (
              (() => {
                const ratio = activePage.aspectRatio || 0.707;
                const isPortrait = ratio <= 1.05;
                return (
                  <div className="relative flex-1 flex items-center justify-center bg-[#060913] border border-white/[0.08] rounded-xl p-2 sm:p-3 overflow-hidden min-h-[260px]">
                    <div
                      className="relative mx-auto rounded-lg overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.65)] border border-white/[0.12] bg-white"
                      style={{
                        aspectRatio: String(ratio),
                        height: isPortrait ? 'min(52vh, 450px)' : 'auto',
                        width: isPortrait ? 'auto' : 'min(100%, 520px)',
                        maxHeight: 'min(52vh, 450px)',
                        maxWidth: '100%',
                      }}
                    >
                      <img
                        src={activePage.previewUrl}
                        alt={`Aperçu réel de la page ${activePage.pageNum}`}
                        className="w-full h-full object-contain select-none pointer-events-none block"
                      />

                      {/* Légère trame scanner */}
                      <div className="absolute inset-0 bg-slate-950/10 pointer-events-none" />

                      {/* Real Detected Coordinate Bounding Boxes */}
                      {activeBoxes.map((box, idx) => {
                        const isFocused = idx === activeBoxIdx;
                        const tokenSample = box.text.slice(0, 18).toLowerCase();
                        const isMatchedInAi =
                          streamedLower.length > 40 &&
                          tokenSample.length >= 6 &&
                          streamedLower.includes(tokenSample);
                        const catStyle = CATEGORY_STYLES[box.category];

                        return (
                          <div
                            key={box.id}
                            data-testid={`pdf-box-${box.category}`}
                            title={`${catStyle.label} : ${box.text}`}
                            className={`absolute rounded-[3px] border transition-all duration-300 pointer-events-none ${
                              catStyle.border
                            } ${
                              isFocused
                                ? `${catStyle.activeBg} z-20 ring-1 ring-white/60`
                                : isMatchedInAi
                                ? 'bg-emerald-400/20 border-emerald-400 z-10'
                                : 'bg-white/5 opacity-75'
                            }`}
                            style={{
                              left: `${box.xPct}%`,
                              top: `${box.yPct}%`,
                              width: `${box.wPct}%`,
                              height: `${box.hPct}%`,
                            }}
                          >
                            {isFocused && (
                              <span
                                className={`absolute ${box.yPct < 10 ? '-bottom-4' : '-top-4'} left-0 px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider shadow ${catStyle.badge}`}
                              >
                                {catStyle.label}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Scanning Laser Beam synchronized with Spider Y */}
                      <div
                        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-85 shadow-[0_0_12px_#38BDF8] pointer-events-none transition-all duration-500 ease-out z-20"
                        style={{ top: `${targetY}%` }}
                      />

                      {/* Robotic Spider traversing actual coordinates */}
                      <div
                        aria-hidden="true"
                        data-testid="spider-robot-indicator"
                        className="absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out pointer-events-none flex flex-col items-center"
                        style={{
                          left: `${Math.max(12, Math.min(88, targetX))}%`,
                          top: `${Math.max(10, Math.min(88, targetY))}%`,
                        }}
                      >
                        <div
                          className="relative transition-transform duration-300 ease-out"
                          style={{ transform: `rotate(${tiltDeg}deg)` }}
                        >
                          <SpiderSvg hasContent={activeBoxes.length > 0} />
                        </div>
                        <div className="px-1.5 py-0.5 rounded bg-[#04060C]/95 border border-cyan-400/50 text-[9px] text-cyan-200 whitespace-nowrap font-mono tracking-wider shadow-md">
                          {activeBox
                            ? `${CATEGORY_STYLES[activeBox.category].label.toUpperCase()} · P.${activePage.pageNum}`
                            : `PAGE ${activePage.pageNum}`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              /* Fallback / Pasted Text Stream View */
              <div className="relative flex-1 min-h-[240px] bg-[#070b14] border border-white/[0.08] rounded-xl p-4 space-y-2.5 overflow-hidden shadow-inner">
                <div
                  className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/90 to-transparent opacity-80 shadow-[0_0_12px_#38BDF8] pointer-events-none transition-all duration-500 ease-in-out"
                  style={{ top: `${targetY}%` }}
                />

                <div
                  aria-hidden="true"
                  data-testid="spider-robot-indicator"
                  className="absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out pointer-events-none flex flex-col items-center"
                  style={{ left: `${targetX}%`, top: `${targetY}%` }}
                >
                  <div
                    className="relative transition-transform duration-300 ease-out"
                    style={{ transform: `rotate(${tiltDeg}deg)` }}
                  >
                    <SpiderSvg hasContent={previewLines.length > 0} />
                  </div>
                  <div className="px-1.5 py-0.5 rounded bg-[#04060C]/90 border border-cyan-400/35 text-[9px] text-cyan-300 whitespace-nowrap font-mono tracking-wider shadow-md">
                    {previewLines.length > 0 ? `LIGNE ${activeLineIdx + 1}/${previewLines.length}` : 'LECTURE PDF'}
                  </div>
                </div>

                {previewLines.length === 0 ? (
                  <div className="h-full min-h-[190px] flex flex-col items-center justify-center text-center px-6 py-10 space-y-2 text-slate-400">
                    <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
                    <p className="text-xs font-sans text-slate-200">
                      Ouverture du document et préparation du balayage géométrique...
                    </p>
                  </div>
                ) : (
                  previewLines.map((line, idx) => {
                    const isHighlighted = idx === activeLineIdx;
                    const isFormula = /[=≈≤≥∫∑∆∇∂√]|\\(?:frac|int|sum|partial)/.test(line);
                    const isTheorem = /\b(?:th[eé]or[eè]me|principe|loi|corollaire|propri[eé]t[eé]|[eé]quation)\b/i.test(line);

                    return (
                      <div
                        key={`${idx}-${line.slice(0, 16)}`}
                        className={`p-2 rounded-lg transition-all duration-300 border ${
                          isHighlighted
                            ? isFormula
                              ? 'bg-amber-500/20 border-amber-400/80 text-amber-200'
                              : isTheorem
                              ? 'bg-cyan-500/20 border-cyan-400/80 text-cyan-200'
                              : 'bg-emerald-500/15 border-emerald-400/70 text-emerald-200'
                            : 'bg-white/[0.02] border-white/[0.04] text-slate-300 opacity-85'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                          <span className="font-mono">Extrait [{idx + 1}]</span>
                          {isHighlighted && (
                            <span className="text-amber-300 font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Analyse en cours
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed font-sans break-words">{line}</p>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Active Selected Box Live Transcript Strip */}
            {activeBox && (
              <div className="mt-2.5 p-2 rounded-lg bg-[#070B14] border border-white/[0.08] flex items-center gap-2 text-[11px] font-sans">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${CATEGORY_STYLES[activeBox.category].badge}`}>
                  {CATEGORY_STYLES[activeBox.category].label}
                </span>
                <span className="text-slate-200 truncate">{activeBox.text}</span>
              </div>
            )}
          </div>

          {/* Real Telemetry Sidebar (1 Col) */}
          <div className="p-4 sm:p-5 bg-[#0A0E19] flex flex-col justify-between space-y-4 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>Éléments Détectés (Réels)</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#04060C] border border-amber-500/20 text-center">
                    <div className="text-base font-bold text-amber-400 font-mono">{realCounts.formulas}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Équations / Formules</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#04060C] border border-sky-500/20 text-center">
                    <div className="text-base font-bold text-cyan-400 font-mono">{realCounts.theorems}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Théorèmes / Lois</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#04060C] border border-emerald-500/20 text-center">
                    <div className="text-base font-bold text-emerald-400 font-mono">{realCounts.definitions}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Unités & Définitions</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#04060C] border border-violet-500/20 text-center">
                    <div className="text-base font-bold text-violet-300 font-mono flex items-center justify-center gap-1">
                      <Table2 className="w-3.5 h-3.5" />
                      <span>{realCounts.tables}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Tableaux / Blocs</div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#04060C] border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-400" />
                  )}
                  <span>{isComplete ? 'Extraction terminée' : 'Étape en cours'}</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-mono break-words">
                  {aiStatusLabel}
                </p>
                {pdfProgress && pdfProgress.total > 0 && (
                  <div className="pt-1 text-[11px] text-sky-300 font-mono">
                    PDF : {pdfProgress.current} / {pdfProgress.total} page{pdfProgress.total > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Multi-segments activé : aucune troncature et zéro donnée inventée.</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="px-4 sm:px-6 py-2.5 border-t border-white/[0.08] bg-[#04060C] flex items-center justify-between text-xs text-slate-400">
          <span>Surbrillance synchronisée sur les coordonnées réelles du PDF.</span>
          <span className="font-mono text-amber-400">FicheMaster IA · Cascade Multi-IA</span>
        </div>
      </div>
    </div>
  );
};

const SpiderSvg: React.FC<{ hasContent: boolean }> = ({ hasContent }) => (
  <svg
    viewBox="0 0 64 64"
    className="w-11 h-11 drop-shadow-[0_0_12px_rgba(56,189,248,0.55)]"
    fill="none"
  >
    <polygon
      points="32,39 20,62 44,62"
      fill="#38BDF8"
      fillOpacity={hasContent ? 0.25 : 0.12}
    />
    <g
      className="spider-leg-a"
      stroke="#94A3B8"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="26,27 16,18 9,23" />
      <polyline points="38,27 48,18 55,23" />
      <polyline points="25,35 13,39 7,49" />
      <polyline points="39,35 51,39 57,49" />
      <circle cx="16" cy="18" r="1.4" fill="#F59E0B" stroke="none" />
      <circle cx="48" cy="18" r="1.4" fill="#F59E0B" stroke="none" />
      <circle cx="13" cy="39" r="1.4" fill="#F59E0B" stroke="none" />
      <circle cx="51" cy="39" r="1.4" fill="#F59E0B" stroke="none" />
    </g>
    <g
      className="spider-leg-b"
      stroke="#64748B"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="25,31 12,28 6,35" />
      <polyline points="39,31 52,28 58,35" />
      <polyline points="27,38 19,48 15,57" />
      <polyline points="37,38 45,48 49,57" />
      <circle cx="12" cy="28" r="1.3" fill="#38BDF8" stroke="none" />
      <circle cx="52" cy="28" r="1.3" fill="#38BDF8" stroke="none" />
      <circle cx="19" cy="48" r="1.3" fill="#38BDF8" stroke="none" />
      <circle cx="45" cy="48" r="1.3" fill="#38BDF8" stroke="none" />
    </g>
    <polygon
      points="28,16 36,16 38,23 26,23"
      fill="#0A0E19"
      stroke="#F59E0B"
      strokeOpacity="0.8"
      strokeWidth="1.3"
    />
    <polygon
      points="27,23 37,23 41,29 39,38 32,41 25,38 23,29"
      fill="#04060C"
      stroke="#F59E0B"
      strokeWidth="1.6"
    />
    <circle cx="32" cy="30" r="3.2" stroke="#38BDF8" strokeOpacity="0.7" strokeWidth="1.1" />
    <g className="spider-optic-pulse">
      <circle cx="29.5" cy="36.2" r="1.3" fill="#38BDF8" />
      <circle cx="34.5" cy="36.2" r="1.3" fill="#38BDF8" />
      <circle cx="32" cy="38.2" r="1" fill="#F59E0B" />
    </g>
  </svg>
);
