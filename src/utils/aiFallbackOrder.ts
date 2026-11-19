export type CloudAIProvider = 'gemini' | 'claude' | 'openai' | 'groq';
export type AnyAIProvider = CloudAIProvider | 'local';

/**
 * Ordre canonique de priorité des fournisseurs d'IA :
 * 1. Gemini (local navigateur / clé Google)
 * 2. Claude (Anthropic)
 * 3. ChatGPT (OpenAI)
 * (+ Groq en secours secondaire si une clé Groq est configurée)
 * 4. Mode Local (strictement en dernier recours)
 */
export const PRIMARY_CLOUD_ORDER: readonly CloudAIProvider[] = [
  'gemini',
  'claude',
  'openai',
];

export const LEGACY_LOCAL_MODEL_ID = 'local-priority';
export const LOCAL_FALLBACK_MODEL_ID = 'local-fallback';
export const DEFAULT_MODEL_ID = 'gemini-3.1-pro';

export interface FallbackResolutionOptions {
  selectedProvider: AnyAIProvider;
  selectedModel: string;
  forceLocal?: boolean;
  configuredKeys: {
    gemini: boolean;
    claude: boolean;
    openai: boolean;
    groq?: boolean;
  };
}

export interface FallbackResolution {
  /** Ordre complet des fournisseurs cloud à tenter avant le mode local */
  cloudOrder: CloudAIProvider[];
  /** Sous-ensemble ordonné des fournisseurs cloud disposant d'une clé configurée */
  configuredCloudChain: CloudAIProvider[];
  /** Vrai uniquement si l'utilisateur a explicitement choisi ou accepté le Mode Local */
  shouldUseLocalImmediately: boolean;
}

/**
 * Normalise l'ID de modèle stocké (migre l'ancien 'local-priority' vers Gemini par défaut).
 */
export function normalizeStoredModelId(storedModel: string | null | undefined): string {
  if (!storedModel || storedModel === LEGACY_LOCAL_MODEL_ID) {
    return DEFAULT_MODEL_ID;
  }
  return storedModel;
}

/**
 * Normalise le fournisseur stocké (si l'ancien 'local-priority' était actif, rétablit Gemini en priorité 1).
 */
export function normalizeStoredProvider(
  storedProvider: string | null | undefined,
  rawStoredModel: string | null | undefined
): AnyAIProvider {
  if (rawStoredModel === LEGACY_LOCAL_MODEL_ID) {
    return 'gemini';
  }
  if (
    storedProvider === 'gemini' ||
    storedProvider === 'claude' ||
    storedProvider === 'openai' ||
    storedProvider === 'groq' ||
    storedProvider === 'local'
  ) {
    return storedProvider;
  }
  return 'gemini';
}

/**
 * Résout la chaîne de priorité et de repli :
 * 1. Gemini (ou le fournisseur cloud explicitement sélectionné en tête, suivi du reste de Gemini -> Claude -> ChatGPT)
 * 2. Groq (secours optionnel si configuré)
 * 3. Mode Local uniquement en dernier recours (ou si forceLocal === true)
 */
export function resolveFallbackChain(options: FallbackResolutionOptions): FallbackResolution {
  const { selectedProvider, selectedModel, forceLocal = false, configuredKeys } = options;

  const isExplicitLocalFallback =
    selectedProvider === 'local' || selectedModel === LOCAL_FALLBACK_MODEL_ID;

  if (forceLocal || isExplicitLocalFallback) {
    return {
      cloudOrder: [],
      configuredCloudChain: [],
      shouldUseLocalImmediately: true,
    };
  }

  let cloudOrder: CloudAIProvider[];
  if (selectedProvider === 'claude' || selectedProvider === 'openai') {
    cloudOrder = [
      selectedProvider,
      ...PRIMARY_CLOUD_ORDER.filter(p => p !== selectedProvider),
    ];
  } else {
    cloudOrder = [...PRIMARY_CLOUD_ORDER];
  }

  if (configuredKeys.groq) {
    cloudOrder.push('groq');
  }

  const configuredCloudChain = cloudOrder.filter(provider => {
    if (provider === 'gemini') return configuredKeys.gemini;
    if (provider === 'claude') return configuredKeys.claude;
    if (provider === 'openai') return configuredKeys.openai;
    if (provider === 'groq') return Boolean(configuredKeys.groq);
    return false;
  });

  return {
    cloudOrder,
    configuredCloudChain,
    shouldUseLocalImmediately: false,
  };
}
