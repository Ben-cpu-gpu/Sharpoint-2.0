import React, { useRef, useState } from 'react';
import {
  X,
  FolderSync,
  Download,
  Upload,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Network,
  Sparkles,
  Info,
} from 'lucide-react';
import { AnnaleItem, StudySheet, Subject, TDExercise } from '../../types/course';
import {
  buildObsidianNewUri,
  buildVaultExportEntries,
  buildZipArchive,
  generateObsidianCanvas,
  parseObsidianMarkdownToSheet,
} from '../../utils/obsidianSync';

interface ObsidianSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheets: StudySheet[];
  tdExercises: TDExercise[];
  annales: AnnaleItem[];
  subjects: Subject[];
  activeSheet?: StudySheet;
  onImportSheets: (imported: StudySheet[]) => void;
  onNotify: (message: string) => void;
}

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
  }) => Promise<FileSystemDirectoryHandle>;
}

async function writeTextFileToDir(
  rootDir: FileSystemDirectoryHandle,
  relativePath: string,
  content: string
): Promise<void> {
  const parts = relativePath.split('/').filter(Boolean);
  let current = rootDir;
  for (let i = 0; i < parts.length - 1; i++) {
    current = await current.getDirectoryHandle(parts[i], { create: true });
  }
  const filename = parts[parts.length - 1];
  const fileHandle = await current.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export const ObsidianSyncModal: React.FC<ObsidianSyncModalProps> = ({
  isOpen,
  onClose,
  sheets,
  tdExercises,
  annales,
  subjects,
  activeSheet,
  onImportSheets,
  onNotify,
}) => {
  const mdInputRef = useRef<HTMLInputElement>(null);
  const [vaultName, setVaultName] = useState('');
  const [isSyncingFolder, setIsSyncingFolder] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const subjectMap = new Map(subjects.map(s => [s.id, s.name]));
  const activeSubjectName = activeSheet
    ? subjectMap.get(activeSheet.subjectId) || activeSheet.subjectId
    : '';

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadZipVault = () => {
    setErrorMessage(null);
    const entries = buildVaultExportEntries(sheets, tdExercises, annales, subjects);
    const zipBytes = buildZipArchive(entries);
    const zipArrayBuffer = zipBytes.buffer.slice(
      zipBytes.byteOffset,
      zipBytes.byteOffset + zipBytes.byteLength
    ) as ArrayBuffer;
    const blob = new Blob([zipArrayBuffer], { type: 'application/zip' });
    triggerDownload(
      blob,
      `FicheMaster-Obsidian-Vault-${new Date().toISOString().split('T')[0]}.zip`
    );
    const msg = `Coffre Obsidian (.zip) téléchargé : ${entries.length} fichiers prêts (Fiches, TD, Annales & .canvas).`;
    setStatusMessage(msg);
    onNotify(msg);
  };

  const handleDownloadCanvas = () => {
    setErrorMessage(null);
    const canvasJson = generateObsidianCanvas(sheets, tdExercises, annales, subjects);
    const blob = new Blob([canvasJson], { type: 'application/json' });
    triggerDownload(blob, 'Système Solaire ESTACA.canvas');
    const msg = 'Carte mentale Obsidian (.canvas) téléchargée.';
    setStatusMessage(msg);
    onNotify(msg);
  };

  const handleDirectFolderSync = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    const pickerWin = window as DirectoryPickerWindow;

    if (typeof pickerWin.showDirectoryPicker !== 'function') {
      setErrorMessage(
        "Votre navigateur actuel ne supporte pas l'accès direct aux dossiers (File System Access API). Utilisez « Télécharger le Coffre (.zip) » ci-dessous puis décompressez-le dans votre coffre Obsidian."
      );
      return;
    }

    setIsSyncingFolder(true);
    try {
      const rootHandle = await pickerWin.showDirectoryPicker({
        id: 'fichemaster-obsidian-vault',
        mode: 'readwrite',
      });
      const subFolder = await rootHandle.getDirectoryHandle('FicheMaster IA', { create: true });
      const entries = buildVaultExportEntries(sheets, tdExercises, annales, subjects);

      for (const entry of entries) {
        await writeTextFileToDir(subFolder, entry.path, entry.content);
      }

      // Also scan any extra user .md files placed inside FicheMaster IA/Inbox/ or Fiches/
      const msg = `Synchronisation réussie : ${entries.length} fichiers écrits dans "${rootHandle.name}/FicheMaster IA/".`;
      setStatusMessage(msg);
      onNotify(msg);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      const rawMsg = String(err?.message || '');
      if (err?.name === 'SecurityError' || rawMsg.toLowerCase().includes('cross origin')) {
        setErrorMessage(
          "L'accès direct au dossier local est bloqué dans cet aperçu iframe sécurisé. Ouvrez l'app dans un onglet autonome pour la synchro dossier en direct, ou utilisez l'export .zip en 1 clic ci-dessous."
        );
      } else {
        setErrorMessage(`Impossible d'écrire dans le dossier sélectionné : ${rawMsg || 'Erreur inconnue'}`);
      }
    } finally {
      setIsSyncingFolder(false);
    }
  };

  const handleImportMarkdownFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setErrorMessage(null);
    const importedSheets: StudySheet[] = [];

    for (const file of Array.from(fileList)) {
      const text = await file.text();
      importedSheets.push(parseObsidianMarkdownToSheet(file.name, text, subjects));
    }

    if (mdInputRef.current) {
      mdInputRef.current.value = '';
    }

    if (importedSheets.length > 0) {
      onImportSheets(importedSheets);
      const msg = `${importedSheets.length} note(s) Obsidian Markdown importée(s) dans vos Fiches de Cours.`;
      setStatusMessage(msg);
      onNotify(msg);
    }
  };

  const obsidianUri = activeSheet
    ? buildObsidianNewUri(activeSheet, activeSubjectName, vaultName)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-modal-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Synchronisation avec Obsidian"
        className="relative w-full max-w-2xl bg-[#0A0E19] border border-purple-400/35 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-modal-panel"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#04060C]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-purple-500/15 border border-purple-400/40 flex items-center justify-center shrink-0">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="w-4 h-4 text-purple-300"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M12 2L5 7.5 3.5 16l5.5 6 7-1.5 4.5-6.5-2-8L12 2z" />
                <path d="M12 2l-2 9 6 9.5" opacity="0.7" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-slate-100 truncate">
                Synchronisation Obsidian
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Markdown + KaTeX natif · Callouts · Wikilinks [[Matière]] · JSON Canvas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le module Obsidian"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Vault Inventory Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-[#04060C] border border-white/[0.08]">
              <span className="text-slate-400 block">Fiches</span>
              <span className="font-mono text-base font-bold text-amber-300">{sheets.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#04060C] border border-white/[0.08]">
              <span className="text-slate-400 block">Exercices TD</span>
              <span className="font-mono text-base font-bold text-sky-300">{tdExercises.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#04060C] border border-white/[0.08]">
              <span className="text-slate-400 block">Annales</span>
              <span className="font-mono text-base font-bold text-emerald-300">{annales.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#04060C] border border-white/[0.08]">
              <span className="text-slate-400 block">Carte Canvas</span>
              <span className="font-mono text-base font-bold text-purple-300">1 (.canvas)</span>
            </div>
          </div>

          {/* Status & Alerts */}
          {statusMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/12 border border-emerald-400/35 text-emerald-200 flex items-start gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-amber-500/12 border border-amber-400/35 text-amber-200 flex items-start gap-2.5 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Export Actions */}
          <div className="space-y-3">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-purple-300">
              1. Exporter ou Synchroniser vers votre Coffre Obsidian
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDownloadZipVault}
                className="p-4 rounded-xl bg-purple-500/18 hover:bg-purple-500/26 border border-purple-400/45 text-left transition-all card-hover-cosmos space-y-1.5"
              >
                <div className="flex items-center gap-2 text-purple-200 font-bold text-xs">
                  <Download className="w-4 h-4 text-purple-300" />
                  <span>Télécharger le Coffre (.zip)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Archive prête à décompresser dans Obsidian avec dossiers Fiches/, TD/, Annales/ et la carte .canvas.
                </p>
              </button>

              <button
                type="button"
                onClick={handleDirectFolderSync}
                disabled={isSyncingFolder}
                className="p-4 rounded-xl bg-[#04060C] hover:bg-[#101625] border border-white/[0.12] hover:border-purple-400/45 text-left transition-all card-hover-cosmos space-y-1.5 disabled:opacity-60"
              >
                <div className="flex items-center gap-2 text-slate-100 font-bold text-xs">
                  <FolderSync className="w-4 h-4 text-sky-400" />
                  <span>
                    {isSyncingFolder
                      ? 'Écriture dans le coffre...'
                      : 'Synchro directe Dossier Local'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Écrit en direct dans votre dossier coffre local (Chrome / Edge hors iframe).
                </p>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleDownloadCanvas}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#04060C] hover:bg-[#101625] border border-white/[0.1] text-slate-200 font-semibold transition-colors"
              >
                <Network className="w-3.5 h-3.5 text-purple-400" />
                <span>Télécharger uniquement la carte (.canvas)</span>
              </button>
            </div>
          </div>

          {/* Deep link active sheet */}
          {activeSheet && obsidianUri && (
            <div className="p-4 rounded-xl bg-[#04060C] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>2. Envoyer la fiche active via obsidian://</span>
                </span>
                <span className="font-mono text-[11px] text-amber-300 truncate max-w-[200px]">
                  {activeSheet.title}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={vaultName}
                  onChange={e => setVaultName(e.target.value)}
                  placeholder="Nom du coffre Obsidian (optionnel, ex: ESTACA)"
                  aria-label="Nom du coffre Obsidian"
                  className="flex-1 rounded-xl bg-[#0A0E19] border border-white/[0.1] px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-400/60"
                />
                <a
                  href={obsidianUri}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#04060C] font-bold transition-colors whitespace-nowrap shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ouvrir dans Obsidian</span>
                </a>
              </div>
            </div>
          )}

          {/* Import Markdown back from Obsidian */}
          <div className="p-4 rounded-xl bg-[#04060C] border border-sky-400/25 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="font-display font-bold text-slate-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>3. Importer des notes Markdown (.md) depuis Obsidian</span>
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Sélectionnez une ou plusieurs notes `.md` de votre coffre Obsidian pour les convertir en fiches FicheMaster IA (LaTeX et callouts préservés).
                </p>
              </div>

              <div>
                <input
                  ref={mdInputRef}
                  type="file"
                  accept=".md,.markdown,text/markdown"
                  multiple
                  onChange={handleImportMarkdownFiles}
                  className="hidden"
                  aria-label="Importer des notes Markdown Obsidian"
                />
                <button
                  type="button"
                  onClick={() => mdInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-[#04060C] font-bold transition-colors whitespace-nowrap shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importer .md</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed pt-1">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Pour une synchronisation continue sur tous vos appareils sans manipulation, pensez aussi au plugin communautaire Obsidian « Local Images / Git » ou placez le dossier extrait dans iCloud Drive / OneDrive.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
