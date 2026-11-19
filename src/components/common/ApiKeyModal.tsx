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
  ShieldCheck, 
  Layers, 
  Laptop, 
  Zap 
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
  AIProvider 
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
    }, 1200);
  };

  const handleClearAllKeys = () => {
    if (confirm('Voulez-vous supprimer toutes les clés API stockées localement ?')) {
      setGeminiApiKey('');
      setAnthropicApiKey('');
      setOpenAIApiKey('');
      setGroqApiKey('');
      setGeminiKey('');
      setClaudeKey('');
      setOpenaiKey('');
      setGroqKey('');
      onKeysUpdated();
    }
  };

  const isGeminiConnected = geminiKey.trim().length > 10;
  const isClaudeConnected = claudeKey.trim().length > 10;
  const isOpenaiConnected = openaiKey.trim().length > 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#1e1f20] border border-[#37393b] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header style Google AI Studio / Gemini Notebook */}
        <div className="px-6 py-4 border-b border-[#37393b] flex items-center justify-between bg-[#131314]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#e3e3e3]">Studio IA • Modèles & Clés API</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Client-Side Only
                </span>
              </div>
              <p className="text-[11px] text-[#8e918f]">
                Gemini 3 Notebook, Claude 5.5, ChatGPT GPT-5 ou Mode Local Prioritaire
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8e918f] hover:text-white hover:bg-[#282a2c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps principal */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 text-xs text-[#c4c7c5]">
          {/* Sélection rapide du Moteur / Fournisseur */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#e3e3e3] flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>Sélectionnez votre Moteur d'IA :</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('gemini')}
                className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                  activeTab === 'gemini'
                    ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500'
                    : 'bg-[#131314] border-[#37393b] text-[#8e918f] hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4 mb-1 text-blue-400" />
                <span className="font-bold text-xs">Gemini 3</span>
                <span className="text-[9px] text-[#8e918f]">Notebook IA</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('claude')}
                className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                  activeTab === 'claude'
                    ? 'bg-purple-600/20 border-purple-500 text-white ring-1 ring-purple-500'
                    : 'bg-[#131314] border-[#37393b] text-[#8e918f] hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4 mb-1 text-purple-400" />
                <span className="font-bold text-xs">Claude 5.5</span>
                <span className="text-[9px] text-[#8e918f]">Sonnet / Haiku</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('openai')}
                className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                  activeTab === 'openai'
                    ? 'bg-emerald-600/20 border-emerald-500 text-white ring-1 ring-emerald-500'
                    : 'bg-[#131314] border-[#37393b] text-[#8e918f] hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4 mb-1 text-emerald-400" />
                <span className="font-bold text-xs">ChatGPT</span>
                <span className="text-[9px] text-[#8e918f]">GPT-5 / GPT-4o</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('local');
                  setModel('local-priority');
                  setSelectedModel('local-priority');
                }}
                className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                  activeTab === 'local'
                    ? 'bg-amber-600/20 border-amber-500 text-white ring-1 ring-amber-500'
                    : 'bg-[#131314] border-[#37393b] text-[#8e918f] hover:text-white'
                }`}
              >
                <Laptop className="w-4 h-4 mb-1 text-amber-400" />
                <span className="font-bold text-xs">Mode Local</span>
                <span className="text-[9px] text-[#8e918f]">Zero Clé 100% Off</span>
              </button>
            </div>
          </div>

          {/* Liste des modèles pour le fournisseur actif */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-[#8e918f] uppercase tracking-wider">
              Variante de modèle active :
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_MODELS.filter(m => m.provider === activeTab).map(m => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => handleSelectModel(m.id, m.provider)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedModel === m.id
                      ? 'bg-blue-600/15 border-blue-500 text-white ring-1 ring-blue-500'
                      : 'bg-[#131314] border-[#37393b] text-[#c4c7c5] hover:border-[#444746]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{m.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#282a2c] text-[#8e918f]">
                      {m.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#8e918f] mt-1">{m.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Onglet 1 : Clé Google Gemini */}
          {activeTab === 'gemini' && (
            <div className="space-y-3 p-4 rounded-2xl bg-[#131314] border border-[#282a2c]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-400" />
                  Clé Google Gemini (Google AI Studio)
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Obtenir clé gratuite</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full rounded-xl bg-[#1e1f20] border border-[#37393b] px-3.5 py-2 text-xs text-white placeholder-[#8e918f] focus:outline-none focus:border-blue-500 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e918f] hover:text-white"
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[10px] text-[#8e918f]">
                {isGeminiConnected ? '✓ Clé Gemini enregistrée et valide sur ce navigateur.' : 'Renseignez votre clé pour activer Gemini 3 Pro et Gemini 3 Flash.'}
              </p>
            </div>
          )}

          {/* Onglet 2 : Clé Anthropic Claude */}
          {activeTab === 'claude' && (
            <div className="space-y-3 p-4 rounded-2xl bg-[#131314] border border-[#282a2c]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-purple-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-purple-400" />
                  Clé API Anthropic (Claude 5.5 Sonnet / Haiku)
                </span>
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
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
                  placeholder="sk-ant-api03-..."
                  className="w-full rounded-xl bg-[#1e1f20] border border-[#37393b] px-3.5 py-2 text-xs text-white placeholder-[#8e918f] focus:outline-none focus:border-purple-500 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowClaudeKey(!showClaudeKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e918f] hover:text-white"
                >
                  {showClaudeKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[10px] text-[#8e918f]">
                {isClaudeConnected ? '✓ Clé Claude active.' : 'Nécessite une clé Anthropic pour utiliser Claude 5.5.'}
              </p>
            </div>
          )}

          {/* Onglet 3 : Clé OpenAI ChatGPT */}
          {activeTab === 'openai' && (
            <div className="space-y-3 p-4 rounded-2xl bg-[#131314] border border-[#282a2c]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  Clé API OpenAI (ChatGPT GPT-5 / GPT-4o)
                </span>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
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
                  placeholder="sk-proj-..."
                  className="w-full rounded-xl bg-[#1e1f20] border border-[#37393b] px-3.5 py-2 text-xs text-white placeholder-[#8e918f] focus:outline-none focus:border-emerald-500 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e918f] hover:text-white"
                >
                  {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[10px] text-[#8e918f]">
                {isOpenaiConnected ? '✓ Clé OpenAI active.' : 'Renseignez votre clé OpenAI pour le raisonnement GPT-5.'}
              </p>
            </div>
          )}

          {/* Onglet 4 : Mode Local Prioritaire */}
          {activeTab === 'local' && (
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-amber-200/90 space-y-2">
              <p className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                <Laptop className="w-4 h-4" />
                Mode Local Prioritaire Activé
              </p>
              <p className="text-[11px] leading-relaxed">
                Toutes vos fiches de cours, TD et annales sont traités <strong>100% dans votre navigateur</strong> via le moteur d'extraction Regex instantané. Aucune clé API ni accès internet n'est sollicité.
              </p>
            </div>
          )}

          {/* Volet System Instruction */}
          <div className="p-3.5 rounded-2xl bg-[#131314] border border-[#37393b] space-y-1.5">
            <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[11px]">
              <Sliders className="w-3.5 h-3.5" />
              <span>System Instruction Universel (Rigueur ESTACA) :</span>
            </div>
            <p className="text-[10px] text-[#8e918f] italic leading-relaxed select-all">
              "{STRICT_EXHAUSTIVENESS_RULE}"
            </p>
          </div>

          {savedSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Modèle et clés mis à jour avec succès !</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-[#37393b]">
            <button
              type="button"
              onClick={handleClearAllKeys}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Effacer clés</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#282a2c] hover:bg-[#37393b] text-[#e3e3e3] text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95"
              >
                <span>Enregistrer</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
