import {
  LOCAL_FALLBACK_MODEL_ID,
  normalizeStoredModelId,
  normalizeStoredProvider,
} from '../utils/aiFallbackOrder';

const GEMINI_KEY_STORAGE = 'fichemaster_gemini_api_key';
const ANTHROPIC_KEY_STORAGE = 'fichemaster_anthropic_api_key';
const OPENAI_KEY_STORAGE = 'fichemaster_openai_api_key';
const GROQ_KEY_STORAGE = 'fichemaster_groq_api_key';
const SELECTED_MODEL_STORAGE = 'fichemaster_selected_model';
const SELECTED_PROVIDER_STORAGE = 'fichemaster_selected_provider';

export type AIProvider = 'gemini' | 'claude' | 'openai' | 'groq' | 'local';

export interface ModelOption {
  id: string;
  provider: AIProvider;
  name: string;
  badge: string;
  description: string;
}

export const ALL_MODELS: ModelOption[] = [
  // --- GOOGLE GEMINI 3 & NOTEBOOK ---
  {
    id: 'gemini-3.1-pro',
    provider: 'gemini',
    name: 'Gemini 3 Pro (Notebook IA)',
    badge: 'Gemini 3',
    description: 'Modèle de référence d\'ingénierie et de calcul formel ultra-avancé'
  },
  {
    id: 'gemini-3-flash',
    provider: 'gemini',
    name: 'Gemini 3 Flash',
    badge: 'Gemini 3',
    description: 'Vitesse instantanée et extraction haute précision pour mobile'
  },
  {
    id: 'gemini-2.5-pro',
    provider: 'gemini',
    name: 'Gemini 2.5 Pro (ESTACA Concours)',
    badge: 'Google AI',
    description: 'Spécialisé pour les polycopiés et annales avec barème rigoureux'
  },

  // --- ANTHROPIC CLAUDE 5.5 ---
  {
    id: 'claude-sonnet-5.5',
    provider: 'claude',
    name: 'Claude Sonnet 5.5',
    badge: 'Anthropic',
    description: 'Démonstrations mathématiques et rédaction de solutions pas à pas'
  },
  {
    id: 'claude-haiku-5.5',
    provider: 'claude',
    name: 'Claude Haiku 5.5',
    badge: 'Anthropic',
    description: 'Synthèse rapide des théorèmes et fiches flashcards légères'
  },

  // --- OPENAI CHATGPT GPT-5 ---
  {
    id: 'gpt-5',
    provider: 'openai',
    name: 'ChatGPT GPT-5',
    badge: 'OpenAI',
    description: 'Raisonnement physique profond et détection chirurgicale des pièges'
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'ChatGPT GPT-4o',
    badge: 'OpenAI',
    description: 'Multimodal rapide et structuration JSON rigoureuse'
  },

  // --- MODE LOCAL (DERNIER RECOURS) ---
  {
    id: LOCAL_FALLBACK_MODEL_ID,
    provider: 'local',
    name: 'Mode Local (Dernier recours)',
    badge: '4e · Offline',
    description: 'Extraction hors-ligne dans votre navigateur uniquement en dernier recours après Gemini, Claude et ChatGPT'
  }
];

// --- GESTION DES CLÉS GEMINI ---
export function getGeminiApiKey(): string {
  const stored = localStorage.getItem(GEMINI_KEY_STORAGE);
  if (stored && stored.trim().length > 0) return stored.trim();
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey.trim();
  return '';
}
export function setGeminiApiKey(key: string): void {
  if (key && key.trim()) localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
  else localStorage.removeItem(GEMINI_KEY_STORAGE);
}

// --- GESTION DES CLÉS ANTHROPIC CLAUDE ---
export function getAnthropicApiKey(): string {
  const stored = localStorage.getItem(ANTHROPIC_KEY_STORAGE);
  if (stored && stored.trim().length > 0) return stored.trim();
  const envKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey.trim();
  return '';
}
export function setAnthropicApiKey(key: string): void {
  if (key && key.trim()) localStorage.setItem(ANTHROPIC_KEY_STORAGE, key.trim());
  else localStorage.removeItem(ANTHROPIC_KEY_STORAGE);
}

// --- GESTION DES CLÉS OPENAI ---
export function getOpenAIApiKey(): string {
  const stored = localStorage.getItem(OPENAI_KEY_STORAGE);
  if (stored && stored.trim().length > 0) return stored.trim();
  const envKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey.trim();
  return '';
}
export function setOpenAIApiKey(key: string): void {
  if (key && key.trim()) localStorage.setItem(OPENAI_KEY_STORAGE, key.trim());
  else localStorage.removeItem(OPENAI_KEY_STORAGE);
}

// --- GESTION DES CLÉS GROQ (Fallback) ---
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

// --- MODÈLE & FOURNISSEUR ACTIF ---
export function getSelectedModel(): string {
  const stored = localStorage.getItem(SELECTED_MODEL_STORAGE);
  const normalized = normalizeStoredModelId(stored);
  if (stored && stored !== normalized) {
    localStorage.setItem(SELECTED_MODEL_STORAGE, normalized);
    localStorage.setItem(SELECTED_PROVIDER_STORAGE, 'gemini');
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

export function hasActiveKeyForCurrentModel(): boolean {
  const provider = getSelectedProvider();
  if (provider === 'local') return true;
  if (provider === 'gemini') return getGeminiApiKey().length > 0;
  if (provider === 'claude') return getAnthropicApiKey().length > 0;
  if (provider === 'openai') return getOpenAIApiKey().length > 0;
  if (provider === 'groq') return getGroqApiKey().length > 0;
  return false;
}
