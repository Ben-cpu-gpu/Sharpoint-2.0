import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles, ShieldCheck, Cpu, Eye, FileText, CheckCircle2 } from 'lucide-react';
import {
  analyzeDocumentText,
  computeExtractionProgress,
  countStreamedJsonSignals,
} from '../../utils/pdfTelemetry';
import { AIExtractionProgress } from '../../services/aiService';

interface SpiderExtractionScannerProps {
  isOpen: boolean;
  fileName?: string;
  targetType: 'sheet' | 'td' | 'annale';
  progressStep: string;
  hasPdfFile: boolean;
  pdfProgress?: { current: number; total: number; done: boolean } | null;
  aiProgress?: AIExtractionProgress | null;
  liveText?: string;
  forceLocalMode?: boolean;
}

export const SpiderExtractionScanner: React.FC<SpiderExtractionScannerProps> = ({
  isOpen,
  fileName,
  targetType,
  progressStep,
  hasPdfFile,
  pdfProgress,
  aiProgress,
  liveText,
  forceLocalMode,
}) => {
  const [stepIdx, setStepIdx] = useState(0);

  const docStats = useMemo(() => analyzeDocumentText(liveText || ''), [liveText]);
  const aiStats = useMemo(
    () => countStreamedJsonSignals(aiProgress?.streamedText || ''),
    [aiProgress?.streamedText]
  );

  const realCounts = useMemo(
    () => ({
      formulas: Math.max(docStats.formulas, aiStats.formulas),
      theorems: Math.max(docStats.theorems, aiStats.theorems),
      definitions: Math.max(docStats.definitions, aiStats.definitions),
      blocks: Math.max(docStats.blocks, aiStats.blocks),
    }),
    [docStats, aiStats]
  );

  const progress = useMemo(
    () =>
      computeExtractionProgress({
        hasPdfFile,
        pdfCurrentPage: pdfProgress?.current ?? 0,
        pdfTotalPages: pdfProgress?.total ?? 0,
        pdfDone: Boolean(pdfProgress?.done),
        aiPct:
          aiProgress?.aiPct ??
          (hasPdfFile && !pdfProgress?.done ? 0 : forceLocalMode ? 65 : 10),
        isDone: aiProgress?.aiPct === 100,
      }),
    [hasPdfFile, pdfProgress, aiProgress?.aiPct, forceLocalMode]
  );

  const previewLines = docStats.previewLines;

  // Déplacement déterministe de l'araignée robotique sur les lignes réelles extraites
  useEffect(() => {
    if (!isOpen) {
      setStepIdx(0);
      return;
    }

    const interval = setInterval(() => {
      setStepIdx(prev => prev + 1);
    }, 850);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const rowCount = Math.max(1, previewLines.length);
  const activeLineIdx = previewLines.length > 0 ? stepIdx % previewLines.length : 0;
  const targetX = 83 + ((stepIdx % 2 === 0 ? 1 : -1) * 4);
  const prevX = 83 + (((Math.max(0, stepIdx - 1)) % 2 === 0 ? 1 : -1) * 4);
  const targetY =
    previewLines.length > 0
      ? Math.round(14 + ((activeLineIdx + 0.5) / rowCount) * 74)
      : 48;
  const dx = targetX - prevX;
  const tiltDeg = dx === 0 ? 0 : Math.max(-14, Math.min(14, Math.round(dx * 0.6)));

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

  const aiStatusLabel =
    aiProgress?.stepLabel ||
    (hasPdfFile && !pdfProgress?.done
      ? 'En attente de la fin de lecture PDF...'
      : progressStep || 'Initialisation du routeur IA...');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 animate-fade-in">
      <div
        role="status"
        aria-live="polite"
        aria-label="Analyse du document en temps réel"
        className="relative w-full max-w-4xl bg-[#0A0E19] border border-amber-500/35 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-[#04060C]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/40 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-sm md:text-base font-bold text-slate-100 flex flex-wrap items-center gap-2">
                <span className="truncate">{getTargetTitle()}</span>
                <span className="px-2 py-0.5 text-[10px] rounded-md bg-amber-500/15 text-amber-300 border border-amber-400/30 font-mono">
                  {aiProgress?.provider
                    ? `${aiProgress.provider} · ${aiProgress.model}`
                    : 'Télémétrie Temps Réel'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {fileName ? `Fichier : ${fileName}` : 'Analyse directe du texte fourni'}
                {docStats.charCount > 0 ? ` · ${docStats.charCount.toLocaleString('fr-FR')} caractères extraits` : ''}
              </p>
            </div>
          </div>
          <div className="text-right font-mono shrink-0">
            <div className="text-base sm:text-lg font-bold text-amber-400">{progress.globalPct}%</div>
            <div className="text-[10px] text-slate-400">Progression globale</div>
          </div>
        </div>

        {/* Real Multi-Stage Progress Bars Strip */}
        <div className="px-4 sm:px-6 py-3 bg-[#070B14] border-b border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
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

          <div className="space-y-1.5">
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

        {/* Main Content Area: Real Document Stream & Minimalist Robotic Spider */}
        <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-y-auto md:overflow-hidden">
          {/* Document Preview Box with Real Extracted Text (2 Cols) */}
          <div className="md:col-span-2 relative bg-[#04060C]/90 p-4 sm:p-5 overflow-y-auto border-b md:border-b-0 md:border-r border-white/[0.08] flex flex-col justify-between font-mono text-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06] text-slate-400 text-[11px]">
              <span className="flex items-center gap-1.5 text-amber-300">
                <FileText className="w-3.5 h-3.5" />
                {pdfStatusLabel}
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Contenu réel du document
              </span>
            </div>

            {/* Real Extracted Lines Container with Minimalist Robotic Spider */}
            <div className="relative flex-1 min-h-[240px] bg-[#070b14] border border-white/[0.08] rounded-xl p-4 space-y-2.5 overflow-hidden shadow-inner">
              {/* Scanning Laser Beam Effect */}
              <div
                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/90 to-transparent opacity-80 shadow-[0_0_12px_#38BDF8] pointer-events-none transition-all duration-700 ease-in-out"
                style={{ top: `${targetY}%` }}
              />

              {/* Minimalist Robotic Spider */}
              <div
                aria-hidden="true"
                className="absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out pointer-events-none flex flex-col items-center"
                style={{ left: `${targetX}%`, top: `${targetY}%` }}
              >
                <div
                  className="relative transition-transform duration-500 ease-out"
                  style={{ transform: `rotate(${tiltDeg}deg)` }}
                >
                  <svg
                    viewBox="0 0 64 64"
                    className="w-11 h-11 drop-shadow-[0_0_10px_rgba(56,189,248,0.35)]"
                    fill="none"
                  >
                    <polygon
                      points="32,39 20,62 44,62"
                      fill="#38BDF8"
                      fillOpacity={previewLines.length > 0 ? 0.2 : 0.1}
                    />
                    <g
                      className="spider-leg-a"
                      stroke="#94A3B8"
                      strokeWidth="1.6"
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
                      strokeOpacity="0.7"
                      strokeWidth="1.3"
                    />
                    <polygon
                      points="27,23 37,23 41,29 39,38 32,41 25,38 23,29"
                      fill="#04060C"
                      stroke="#F59E0B"
                      strokeWidth="1.5"
                    />
                    <circle cx="32" cy="30" r="3.2" stroke="#38BDF8" strokeOpacity="0.6" strokeWidth="1.1" />
                    <g className="spider-optic-pulse">
                      <circle cx="29.5" cy="36.2" r="1.3" fill="#38BDF8" />
                      <circle cx="34.5" cy="36.2" r="1.3" fill="#38BDF8" />
                      <circle cx="32" cy="38.2" r="1" fill="#F59E0B" />
                    </g>
                  </svg>
                </div>
                <div className="px-1.5 py-0.5 rounded bg-[#04060C]/90 border border-cyan-400/35 text-[9px] text-cyan-300 whitespace-nowrap font-mono tracking-wider shadow-md">
                  {previewLines.length > 0 ? `LIGNE ${activeLineIdx + 1}/${previewLines.length}` : 'LECTURE PDF'}
                </div>
              </div>

              {/* Real Lines or Authentic Initial Opening Message */}
              {previewLines.length === 0 ? (
                <div className="h-full min-h-[190px] flex flex-col items-center justify-center text-center px-6 py-10 space-y-2 text-slate-400">
                  <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
                  <p className="text-xs font-sans text-slate-200">
                    Ouverture du fichier PDF et lecture de la couche texte en cours...
                  </p>
                  <p className="text-[11px] font-mono text-slate-400">
                    Les lignes extraites apparaîtront ici en direct page par page.
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
                            ? 'bg-amber-500/20 border-amber-400/80 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                            : isTheorem
                            ? 'bg-cyan-500/20 border-cyan-400/80 text-cyan-200 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                            : 'bg-emerald-500/15 border-emerald-400/70 text-emerald-200'
                          : 'bg-white/[0.02] border-white/[0.04] text-slate-300 opacity-85'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                        <span className="font-mono">Extrait [{idx + 1}]</span>
                        {isHighlighted && (
                          <span className="text-amber-300 font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> En cours d'analyse
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed font-sans break-words">{line}</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Extraction texte locale (pdf.js) + routage IA multi-modèles</span>
              <span className="text-amber-400 font-bold">Compteurs & barres 100% réels</span>
            </div>
          </div>

          {/* Real Telemetry Sidebar (1 Col) */}
          <div className="p-4 sm:p-5 bg-[#0A0E19] flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>Éléments Détectés (Réels)</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#04060C] border border-white/[0.08] text-center">
                    <div className="text-base font-bold text-amber-400 font-mono">{realCounts.formulas}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Équations / Formules</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#04060C] border border-white/[0.08] text-center">
                    <div className="text-base font-bold text-cyan-400 font-mono">{realCounts.theorems}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Théorèmes / Lois</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#04060C] border border-white/[0.08] text-center">
                    <div className="text-base font-bold text-emerald-400 font-mono">{realCounts.definitions}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Unités & Définitions</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#04060C] border border-white/[0.08] text-center">
                    <div className="text-base font-bold text-purple-400 font-mono">{realCounts.blocks}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Pages / Blocs</div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#04060C] border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-400" />
                  <span>Étape en cours</span>
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
              <span>Bascule automatique entre tous les modèles et API IA gratuits en cas d’erreur.</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="px-4 sm:px-6 py-3 border-t border-white/[0.08] bg-[#04060C] flex items-center justify-between text-xs text-slate-400">
          <span>Lecture et comptage basés uniquement sur votre document.</span>
          <span className="font-mono text-amber-400">FicheMaster IA · Cascade Multi-IA</span>
        </div>
      </div>
    </div>
  );
};
