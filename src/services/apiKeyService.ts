import {
  AnyAIProvider,
  LOCAL_FALLBACK_MODEL_ID,
  normalizeStoredModelId,
  normalizeStoredProvider,
} from '../utils/aiFallbackOrder';

const GROQ_KEY_STORAGE = 'fichemaster_groq_api_key';
const CEREBRAS_KEY_STORAGE = 'fichemaster_cerebras_api_key';
const MISTRAL_KEY_STORAGE = 'fichemaster_mistral_api_key';
const OPENROUTER_KEY_STORAGE = 'fichemaster_openrouter_api_key';
const SELECTED_MODEL_STORAGE = 'fichemaster_selected_model';
const SELECTED_PROVIDER_STORAGE = 'fichemaster_selected_provider';

let serverGeminiConfigured = true;

export function getServerGeminiConfigured(): boolean {
  return serverGeminiConfigured;
}

export function setServerGeminiConfigured(configured: boolean): void {
  serverGeminiConfigured = configured;
}

export type AIProvider = AnyAIProvider;

export interface ModelOption {
  id: string;
  provider: AIProvider;
  name: string;
  badge: string;
  description: string;
  isFreeTier?: boolean;
  sourceLabel?: string;
}

export const ALL_MODELS: ModelOption[] = [
  // --- 1. GOOGLE GEMINI (EXÉCUTÉ CÔTÉ SERVEUR · PRIORITÉ #1) ---
  {
    id: 'gemini-4-hydrogen',
    provider: 'gemini',
    name: 'Gemini 4 Hydrogen',
    badge: '1er · Serveur Prioritaire',
    isFreeTier: true,
    sourceLabel: 'Serveur Gemini (@google/genai)',
    description: 'Modèle principal de votre compte Google exécuté côté serveur pour fiches, TD, annales, QCM et KaTeX',
  },
  {
    id: 'gemini-3.1-flash-lite',
    provider: 'gemini',
    name: 'Gemini 3.1 Flash Lite',
    badge: 'Serveur · Secours rapide',
    isFreeTier: true,
    sourceLabel: 'Serveur Gemini (@google/genai)',
    description: 'Modèle léger de secours à très faible latence si Gemini 4 Hydrogen est saturé',
  },

  // --- 2. GROQ CLOUD (awesome-free-llm-apis · SANS CARTE BANCAIRE) ---
  {
    id: 'llama-3.3-70b-versatile',
    provider: 'groq',
    name: 'Llama 3.3 70B Versatile',
    badge: 'Gratuit · Groq',
    isFreeTier: true,
    sourceLabel: 'awesome-free-llm-apis · Groq LPU',
    description: 'Inférence LPU ultra-rapide gratuite sans CB (console.groq.com), très performant en sciences',
  },
  {
    id: 'qwen/qwen3-32b',
    provider: 'groq',
    name: 'Qwen 3 32B',
    badge: 'Gratuit · Groq',
    isFreeTier: true,
    sourceLabel: 'awesome-free-llm-apis · Groq LPU',
    description: 'Modèle ouvert performant en mathématiques, physique et code',
  },
  {
    id: 'llama-3.1-8b-instant',
    provider: 'groq',
    name: 'Llama 3.1 8B Instant',
    badge: 'Gratuit · Groq',
    isFreeTier: true,
    sourceLabel: 'awesome-free-llm-apis · Groq Free Tier',
    description: 'Réponse quasi instantanée avec quotas gratuits quotidiens élevés',
  },

  // --- 3. CEREBRAS CLOUD (awesome-free-llm-apis · 1M TOKENS/JOUR GRATUITS) ---
  {
    id: 'llama-3.3-70b',
    provider: 'cerebras',
    name: 'Llama 3.3 70B (Cerebras)',
    badge: 'Gratuit · Cerebras',
    isFreeTier: true,
    sourceLabel: 'awesome-free-llm-apis · Cerebras 1M tok/j',
    description: '1 million de tokens gratuits/jour sans carte bancaire (cloud.cerebras.ai) à débit record',
  },
  {
    id: 'qwen-3-32b',
    provider: 'cerebras',
    name: 'Qwen 3 32B (Cerebras)',
    badge: 'Gratuit · Cerebras',
    isFreeTier: true,
    sourceLabel: 'awesome-free-llm-apis · Cerebras Free',
    description: 'Raisonnement scientifique et équations LaTeX haute vitesse sur puce Wafer-Scale',
  },
  {
    id: 'llama3.1-8b',
    provider: 'cerebras',
    name: 'Llama 3.1 8B (Cerebras)',
    badge: 'Gratuit · Cerebras',
    isFreeTier: true,
    sourceLabel: 'awesome-free-llm-apis · Cerebras Free',
    description: 'Modèle léger ultra-rapide pour QCM et fiches express',
  },

  // --- 4. MISTRAL AI (awesome-free-llm-apis · TIER EXPERIMENT GRATUIT) ---
  {
    id: 'mistral-small-latest',
    provider: 'mistral',
    name: 'Mistral Small Latest',
    badge: 'Gratuit · Mistral',
    isFreeTier: true,
    sourceLabel: 'awesome-free-llm-apis · La Plateforme FR',
    description: 'Modèle français gratuit en tier Experiment (console.mistral.ai) avec excellent français scientifique',
  },
  {
    id: 'open-mistral-nemo',
    provider: 'mistral',
    name: 'Open Mistral Nemo',
    badge: 'Gratuit · Mistral',
    isFreeTier: true,
    sourceLabel: 'awesome-free-llm-apis · La Plateforme FR',
    description: 'Modèle ouvert multilingue optimisé pour synthèses structurées et JSON',
  },

  // --- 5. OPENROUTER (:free OFFICIEL · awesome-free-llm-apis · 0€) ---
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    provider: 'openrouter',
    name: 'Llama 3.3 70B Instruct (:free)',
    badge: 'Gratuit · OpenRouter',
    isFreeTier: true,
    sourceLabel: 'awesome-free-llm-apis · OpenRouter :free',
    description: 'Route gratuite officielle OpenRouter (0€) basée sur Meta Llama 3.3',
  },
  {
    id: 'deepseek/deepseek-r1-0528:free',
    provider: 'openrouter',
    name: 'DeepSeek R1 (:free)',
    badge: 'Gratuit · OpenRouter',
    isFreeTier: true,
    sourceLabel: 'awesome-free-llm-apis · OpenRouter :free',
    description: 'Modèle de raisonnement mathématique et physique pas-à-pas gratuit',
  },
  {
    id: 'google/gemma-3-27b-it:free',
    provider: 'openrouter',
    name: 'Gemma 3 27B (:free)',
    badge: 'Gratuit · OpenRouter',
    isFreeTier: true,
    sourceLabel: 'awesome-free-llm-apis · OpenRouter :free',
    description: 'Modèle ouvert Google Gemma 3 hébergé sur tier gratuit OpenRouter',
  },

  // --- 6. MODE LOCAL (DERNIER RECOURS) ---
  {
    id: LOCAL_FALLBACK_MODEL_ID,
    provider: 'local',
    name: 'Mode Local (Dernier recours)',
    badge: 'Dernier recours · Offline',
    isFreeTier: true,
    sourceLabel: 'Navigateur (100% Hors-ligne)',
    description: 'Extraction hors-ligne dans votre navigateur uniquement si Gemini et toutes les API gratuites sont indisponibles',
  },
];

// --- GESTION DES CLÉS GROQ (awesome-free-llm-apis) ---
export function getGroqApiKey(): string {
  const stored = localStorage.getItem(GROQ_KEY_STORAGE);
  if (stored && stored.trim().length > 0) return stored.trim();
  const envKey = (import.meta as any).env?.VITE_GROQ_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey.trim();
  return '';
}
export function setGroqApiKey(key: string): void {
  if (key && key.trim()) localStorage.setItem(GROQ_KEY_STORAGE, key.trim());
  else localStorage.removeItem(GROQ_KEY_STORAGE);
}

// --- GESTION DES CLÉS CEREBRAS (awesome-free-llm-apis) ---
export function getCerebrasApiKey(): string {
  const stored = localStorage.getItem(CEREBRAS_KEY_STORAGE);
  if (stored && stored.trim().length > 0) return stored.trim();
  const envKey = (import.meta as any).env?.VITE_CEREBRAS_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey.trim();
  return '';
}
export function setCerebrasApiKey(key: string): void {
  if (key && key.trim()) localStorage.setItem(CEREBRAS_KEY_STORAGE, key.trim());
  else localStorage.removeItem(CEREBRAS_KEY_STORAGE);
}

// --- GESTION DES CLÉS MISTRAL AI (awesome-free-llm-apis) ---
export function getMistralApiKey(): string {
  const stored = localStorage.getItem(MISTRAL_KEY_STORAGE);
  if (stored && stored.trim().length > 0) return stored.trim();
  const envKey = (import.meta as any).env?.VITE_MISTRAL_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey.trim();
  return '';
}
export function setMistralApiKey(key: string): void {
  if (key && key.trim()) localStorage.setItem(MISTRAL_KEY_STORAGE, key.trim());
  else localStorage.removeItem(MISTRAL_KEY_STORAGE);
}

// --- GESTION DES CLÉS OPENROUTER (:free · awesome-free-llm-apis) ---
export function getOpenRouterApiKey(): string {
  const stored = localStorage.getItem(OPENROUTER_KEY_STORAGE);
  if (stored && stored.trim().length > 0) return stored.trim();
  const envKey = (import.meta as any).env?.VITE_OPENROUTER_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey.trim();
  return '';
}
export function setOpenRouterApiKey(key: string): void {
  if (key && key.trim()) localStorage.setItem(OPENROUTER_KEY_STORAGE, key.trim());
  else localStorage.removeItem(OPENROUTER_KEY_STORAGE);
}

// --- MODÈLE & FOURNISSEUR ACTIF ---
export function getSelectedModel(): string {
  const stored = localStorage.getItem(SELECTED_MODEL_STORAGE);
  const normalized = normalizeStoredModelId(stored);
  if (stored && stored !== normalized) {
    localStorage.setItem(SELECTED_MODEL_STORAGE, normalized);
    if (
      stored === 'local-priority' ||
      stored.startsWith('claude-') ||
      stored.startsWith('gpt-')
    ) {
      localStorage.setItem(SELECTED_PROVIDER_STORAGE, 'gemini');
    }
  }
  return normalized;
}
export function setSelectedModel(modelId: string): void {
  const normalized = normalizeStoredModelId(modelId);
  localStorage.setItem(SELECTED_MODEL_STORAGE, normalized);
  const found = ALL_MODELS.find(m => m.id === normalized);
  if (found) {
    setSelectedProvider(found.provider);
  }
}

export function getSelectedProvider(): AIProvider {
  const rawModel = localStorage.getItem(SELECTED_MODEL_STORAGE);
  const stored = localStorage.getItem(SELECTED_PROVIDER_STORAGE);
  const normalized = normalizeStoredProvider(stored, rawModel);
  if (stored && stored !== normalized) {
    localStorage.setItem(SELECTED_PROVIDER_STORAGE, normalized);
  }
  return normalized;
}
export function setSelectedProvider(provider: AIProvider): void {
  localStorage.setItem(SELECTED_PROVIDER_STORAGE, provider);
}

export function hasKeyForProvider(provider: AIProvider): boolean {
  if (provider === 'local') return true;
  if (provider === 'gemini') return serverGeminiConfigured;
  if (provider === 'groq') return getGroqApiKey().length > 0;
  if (provider === 'cerebras') return getCerebrasApiKey().length > 0;
  if (provider === 'mistral') return getMistralApiKey().length > 0;
  if (provider === 'openrouter') return getOpenRouterApiKey().length > 0;
  return false;
}

export function hasActiveKeyForCurrentModel(): boolean {
  return hasKeyForProvider(getSelectedProvider());
}
