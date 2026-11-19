import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  Trash2,
  Cpu,
  Sliders,
  Layers,
  Laptop,
  Zap,
} from 'lucide-react';
import {
  getGeminiApiKey,
  setGeminiApiKey,
  getAnthropicApiKey,
  setAnthropicApiKey,
  getOpenAIApiKey,
  setOpenAIApiKey,
  getGroqApiKey,
  setGroqApiKey,
  getSelectedModel,
  setSelectedModel,
  getSelectedProvider,
  setSelectedProvider,
  ALL_MODELS,
  AIProvider,
} from '../../services/apiKeyService';
import { STRICT_EXHAUSTIVENESS_RULE } from '../../services/aiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeysUpdated: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeysUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<AIProvider>('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [selectedModel, setModel] = useState('gemini-3.1-pro');

  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGeminiKey(getGeminiApiKey());
      setClaudeKey(getAnthropicApiKey());
      setOpenaiKey(getOpenAIApiKey());
      setGroqKey(getGroqApiKey());
      const m = getSelectedModel();
      setModel(m);
      setActiveTab(getSelectedProvider());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectModel = (modelId: string, provider: AIProvider) => {
    setModel(modelId);
    setActiveTab(provider);
    setSelectedModel(modelId);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiApiKey(geminiKey);
    setAnthropicApiKey(claudeKey);
    setOpenAIApiKey(openaiKey);
    setGroqApiKey(groqKey);
    setSelectedModel(selectedModel);
    setSelectedProvider(activeTab);
    onKeysUpdated();
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  const handleClearAllKeys = () => {
    setGeminiApiKey('');
    setAnthropicApiKey('');
    setOpenAIApiKey('');
    setGroqApiKey('');
    setGeminiKey('');
    setClaudeKey('');
    setOpenaiKey('');
    setGroqKey('');
    onKeysUpdated();
  };

  const isGeminiConnected = geminiKey.trim().length > 10;
  const isClaudeConnected = claudeKey.trim().length > 10;
  const isOpenaiConnected = openaiKey.trim().length > 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Modèles et Clés API"
        className="relative w-full max-w-2xl bg-[#0A0E19] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#04060C]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-slate-100">
                Studio IA · Modèles & Clés API
              </h2>
              <p className="text-xs text-slate-400">
                Exécution locale navigateur · Gemini, Claude, OpenAI ou Mode Offline
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer les paramètres"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>Fournisseur d'IA actif</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('gemini')}
                className={`p-3 rounded-xl border flex flex-col items-center text-center transition-colors ${
                  activeTab === 'gemini'
                    ? 'bg-[#101625] border-amber-400/50 text-white'
                    : 'bg-[#04060C] border-white/[0.08] text-slate-400 hover:text-slate-100'
                }`}
              >
                <Sparkles className="w-4 h-4 mb-1.5 text-amber-400" />
                <span className="font-semibold text-xs">Gemini 3</span>
                <span className="text-[11px] text-slate-400">Notebook IA</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('claude')}
                className={`p-3 rounded-xl border flex flex-col items-center text-center transition-colors ${
                  activeTab === 'claude'
                    ? 'bg-[#101625] border-sky-400/50 text-white'
                    : 'bg-[#04060C] border-white/[0.08] text-slate-400 hover:text-slate-100'
                }`}
              >
                <Zap className="w-4 h-4 mb-1.5 text-sky-400" />
                <span className="font-semibold text-xs">Claude 5.5</span>
                <span className="text-[11px] text-slate-400">Sonnet / Haiku</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('openai')}
                className={`p-3 rounded-xl border flex flex-col items-center text-center transition-colors ${
                  activeTab === 'openai'
                    ? 'bg-[#101625] border-emerald-400/50 text-white'
                    : 'bg-[#04060C] border-white/[0.08] text-slate-400 hover:text-slate-100'
                }`}
              >
                <Layers className="w-4 h-4 mb-1.5 text-emerald-400" />
                <span className="font-semibold text-xs">ChatGPT</span>
                <span className="text-[11px] text-slate-400">GPT-5 / 4o</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('local');
                  setModel('local-priority');
                  setSelectedModel('local-priority');
                }}
                className={`p-3 rounded-xl border flex flex-col items-center text-center transition-colors ${
                  activeTab === 'local'
                    ? 'bg-[#101625] border-amber-400/50 text-white'
                    : 'bg-[#04060C] border-white/[0.08] text-slate-400 hover:text-slate-100'
                }`}
              >
                <Laptop className="w-4 h-4 mb-1.5 text-amber-300" />
                <span className="font-semibold text-xs">Mode Local</span>
                <span className="text-[11px] text-slate-400">100% Offline</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-300">
              Variante de modèle active
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ALL_MODELS.filter(m => m.provider === activeTab).map(m => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => handleSelectModel(m.id, m.provider)}
                  className={`p-3.5 rounded-xl border text-left transition-colors ${
                    selectedModel === m.id
                      ? 'bg-[#101625] border-amber-400/50 text-white'
                      : 'bg-[#04060C] border-white/[0.08] text-slate-300 hover:border-white/[0.2]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-slate-100">{m.name}</span>
                    <span className="text-[11px] font-mono text-amber-300/90 shrink-0">{m.badge}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{m.description}</p>
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'gemini' && (
            <div className="space-y-3 p-4 rounded-xl bg-[#04060C] border border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-amber-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Clé Google Gemini</span>
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:underline flex items-center gap-1"
                >
                  <span>Obtenir une clé</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  aria-label="Clé API Google Gemini"
                  placeholder="AIzaSy..."
                  className="w-full rounded-xl bg-[#0A0E19] border border-white/[0.12] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  aria-label={showGeminiKey ? 'Masquer la clé Gemini' : 'Afficher la clé Gemini'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                {isGeminiConnected
                  ? 'Clé Gemini enregistrée sur ce navigateur.'
                  : 'Renseignez votre clé pour activer Gemini 3 Pro et Gemini 3 Flash.'}
              </p>
            </div>
          )}

          {activeTab === 'claude' && (
            <div className="space-y-3 p-4 rounded-xl bg-[#04060C] border border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-sky-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-sky-400" />
                  <span>Clé API Anthropic</span>
                </span>
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:underline flex items-center gap-1"
                >
                  <span>console.anthropic.com</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  type={showClaudeKey ? 'text' : 'password'}
                  value={claudeKey}
                  onChange={e => setClaudeKey(e.target.value)}
                  aria-label="Clé API Anthropic Claude"
                  placeholder="sk-ant-api03-..."
                  className="w-full rounded-xl bg-[#0A0E19] border border-white/[0.12] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400/60 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowClaudeKey(!showClaudeKey)}
                  aria-label={showClaudeKey ? 'Masquer la clé Claude' : 'Afficher la clé Claude'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showClaudeKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                {isClaudeConnected ? 'Clé Claude active.' : 'Nécessite une clé Anthropic pour Claude 5.5.'}
              </p>
            </div>
          )}

          {activeTab === 'openai' && (
            <div className="space-y-3 p-4 rounded-xl bg-[#04060C] border border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-emerald-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Clé API OpenAI</span>
                </span>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:underline flex items-center gap-1"
                >
                  <span>platform.openai.com</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  type={showOpenaiKey ? 'text' : 'password'}
                  value={openaiKey}
                  onChange={e => setOpenaiKey(e.target.value)}
                  aria-label="Clé API OpenAI"
                  placeholder="sk-proj-..."
                  className="w-full rounded-xl bg-[#0A0E19] border border-white/[0.12] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/60 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  aria-label={showOpenaiKey ? 'Masquer la clé OpenAI' : 'Afficher la clé OpenAI'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                {isOpenaiConnected ? 'Clé OpenAI active.' : 'Renseignez votre clé OpenAI pour GPT-5.'}
              </p>
            </div>
          )}

          {activeTab === 'local' && (
            <div className="p-4 rounded-xl bg-[#04060C] border border-amber-400/30 text-amber-100/90 space-y-1.5">
              <p className="font-semibold text-xs text-amber-300 flex items-center gap-1.5">
                <Laptop className="w-4 h-4" />
                <span>Mode Local Prioritaire Activé</span>
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Toutes vos fiches de cours, TD et annales sont extraits dans votre navigateur sans clé API ni requête externe.
              </p>
            </div>
          )}

          <div className="p-4 rounded-xl bg-[#04060C] border border-white/[0.08] space-y-1.5">
            <div className="flex items-center gap-1.5 text-sky-300 font-semibold text-xs">
              <Sliders className="w-3.5 h-3.5" />
              <span>Instruction Système (Rigueur ESTACA)</span>
            </div>
            <p className="text-[11px] text-slate-400 italic leading-relaxed select-all">
              "{STRICT_EXHAUSTIVENESS_RULE}"
            </p>
          </div>

          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-400/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Modèle et clés mis à jour avec succès.</span>
            </div>
          )}

          <div className="pt-3 flex items-center justify-between border-t border-white/[0.08]">
            <button
              type="button"
              onClick={handleClearAllKeys}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Effacer clés</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#04060C] hover:bg-[#101625] border border-white/[0.1] text-slate-200 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#04060C] text-xs font-bold transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
