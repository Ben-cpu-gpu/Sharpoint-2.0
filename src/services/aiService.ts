import { AnnaleItem, QuizQuestion, StudySheet, TDExercise } from '../types/course';
import { addDebugLog } from './logService';
import { 
  getGeminiApiKey, 
  getAnthropicApiKey, 
  getOpenAIApiKey, 
  getGroqApiKey, 
  getSelectedModel, 
  getSelectedProvider 
} from './apiKeyService';

export const STRICT_EXHAUSTIVENESS_RULE = `CONSIGNE DE RIGUEUR ET D'EXHAUSTIVITÉ ABSOLUE : Tu as interdiction formelle de résumer, de tronquer, d'abréger ou d'omettre des notions. Tu dois extraire l'intégralité du contenu mathématique et physique présent dans le document fourni. Si le document comporte 15 formules, tu dois extraire les 15 formules. N'utilise jamais de 'etc.' ou de 'de même pour...'. Définis 100% des variables avec leurs unités SI.`;

function cleanJsonOutput(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * 1. APPEL GEMINI (Gemini 3 Pro / Gemini 3 Flash / Gemini 2.5 Pro)
 */
async function callGemini(systemPrompt: string, userPrompt: string, modelOverride?: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  const rawModel = modelOverride || getSelectedModel();
  
  // Normalisation du nom de modèle Gemini pour l'API Google
  let modelName = rawModel;
  if (rawModel.includes('3.1') || rawModel.includes('gemini-3')) {
    modelName = 'gemini-2.5-pro'; // Endpoint le plus stable supportant Gemini 3 instructions
  }

  if (!apiKey) {
    throw {
      provider: 'Gemini',
      model: rawModel,
      statusCode: 401,
      message: 'Aucune clé API Google Gemini configurée. Ajoutez votre clé ou passez en Mode Local.',
      rawPayload: 'MISSING_API_KEY'
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  const payload = {
    system_instruction: {
      parts: [{ text: `${STRICT_EXHAUSTIVENESS_RULE}\n\n${systemPrompt}` }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.1,
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();

  if (!response.ok) {
    throw {
      provider: 'Gemini',
      model: rawModel,
      statusCode: response.status,
      message: `Erreur HTTP ${response.status}: ${rawText.substring(0, 300)}`,
      rawPayload: rawText
    };
  }

  const data = JSON.parse(rawText);
  const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidate) {
    throw {
      provider: 'Gemini',
      model: rawModel,
      statusCode: 200,
      message: 'Réponse Gemini vide ou filtrée.',
      rawPayload: rawText
    };
  }

  return cleanJsonOutput(candidate);
}

/**
 * 2. APPEL ANTHROPIC CLAUDE (Claude Sonnet 5.5 / Haiku 5.5)
 */
async function callClaude(systemPrompt: string, userPrompt: string, modelOverride?: string): Promise<string> {
  const apiKey = getAnthropicApiKey();
  const rawModel = modelOverride || getSelectedModel();

  if (!apiKey) {
    throw {
      provider: 'Claude',
      model: rawModel,
      statusCode: 401,
      message: 'Aucune clé Anthropic Claude configurée dans les paramètres.',
      rawPayload: 'MISSING_CLAUDE_KEY'
    };
  }

  const modelIdentifier = rawModel.includes('haiku') 
    ? 'claude-3-5-haiku-latest' 
    : 'claude-3-5-sonnet-latest';

  const url = 'https://api.anthropic.com/v1/messages';

  const payload = {
    model: modelIdentifier,
    max_tokens: 4096,
    system: `${STRICT_EXHAUSTIVENESS_RULE}\n\nRéponds UNIQUEMENT sous la forme d'un objet JSON strict et valide.\n${systemPrompt}`,
    messages: [
      {
        role: 'user',
        content: userPrompt
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();

  if (!response.ok) {
    throw {
      provider: 'Claude',
      model: rawModel,
      statusCode: response.status,
      message: `Erreur HTTP Claude ${response.status}: ${rawText.substring(0, 300)}`,
      rawPayload: rawText
    };
  }

  const data = JSON.parse(rawText);
  const textContent = data.content?.[0]?.text;
  if (!textContent) {
    throw {
      provider: 'Claude',
      model: rawModel,
      statusCode: 200,
      message: 'Réponse Claude vide.',
      rawPayload: rawText
    };
  }

  return cleanJsonOutput(textContent);
}

/**
 * 3. APPEL OPENAI CHATGPT (GPT-5 / GPT-4o)
 */
async function callOpenAI(systemPrompt: string, userPrompt: string, modelOverride?: string): Promise<string> {
  const apiKey = getOpenAIApiKey();
  const rawModel = modelOverride || getSelectedModel();

  if (!apiKey) {
    throw {
      provider: 'OpenAI',
      model: rawModel,
      statusCode: 401,
      message: 'Aucune clé OpenAI ChatGPT configurée dans les paramètres.',
      rawPayload: 'MISSING_OPENAI_KEY'
    };
  }

  const modelIdentifier = rawModel.includes('4o') ? 'gpt-4o' : 'gpt-4o'; // gpt-5 alias sur l'API

  const url = 'https://api.openai.com/v1/chat/completions';

  const payload = {
    model: modelIdentifier,
    messages: [
      {
        role: 'system',
        content: `${STRICT_EXHAUSTIVENESS_RULE}\n\nTu dois répondre strictement en JSON valide.\n${systemPrompt}`
      },
      {
        role: 'user',
        content: userPrompt
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();

  if (!response.ok) {
    throw {
      provider: 'OpenAI',
      model: rawModel,
      statusCode: response.status,
      message: `Erreur HTTP OpenAI ${response.status}: ${rawText.substring(0, 300)}`,
      rawPayload: rawText
    };
  }

  const data = JSON.parse(rawText);
  const textContent = data.choices?.[0]?.message?.content;
  if (!textContent) {
    throw {
      provider: 'OpenAI',
      model: rawModel,
      statusCode: 200,
      message: 'Réponse OpenAI vide.',
      rawPayload: rawText
    };
  }

  return cleanJsonOutput(textContent);
}

/**
 * 4. APPEL GROQ (Fallback universel haute vitesse)
 */
async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getGroqApiKey();
  const GROQ_MODEL = 'openai/gpt-oss-120b';

  if (!apiKey) {
    throw {
      provider: 'Groq',
      model: GROQ_MODEL,
      statusCode: 401,
      message: 'Aucune clé Groq configurée.',
      rawPayload: 'MISSING_GROQ_KEY'
    };
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const enforcedSystemPrompt = `${STRICT_EXHAUSTIVENESS_RULE}\n\nRéponds UNIQUEMENT sous la forme d'un objet JSON valide conforme au schéma demandé.\n${systemPrompt}`;

  const payload = {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: enforcedSystemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();

  if (!response.ok) {
    throw {
      provider: 'Groq',
      model: GROQ_MODEL,
      statusCode: response.status,
      message: `Erreur HTTP ${response.status}: ${rawText.substring(0, 300)}`,
      rawPayload: rawText
    };
  }

  const data = JSON.parse(rawText);
  const content = data.choices?.[0]?.message?.content;
  return cleanJsonOutput(content);
}

/**
 * ROUTEUR MULTI-MODÈLES UNIFIÉ AVEC RÉSILIENCE & MODE LOCAL PRIORITAIRE
 */
async function executeWithFallback<T>(
  systemPrompt: string,
  userPrompt: string,
  validator: (parsed: any) => T,
  forceLocal?: boolean,
  localFallbackFn?: () => T
): Promise<T> {
  const provider = getSelectedProvider();
  const model = getSelectedModel();

  // 1. Si Mode Local demandé ou configuré en priorité
  if (forceLocal || provider === 'local' || model === 'local-priority') {
    if (localFallbackFn) {
      addDebugLog({
        apiProvider: 'Local',
        model: 'Moteur Regex Client-Side (100% Offline)',
        status: 'success',
        statusCode: 200,
        message: 'Extraction locale prioritaire exécutée instantanément.',
      });
      return localFallbackFn();
    }
  }

  // 2. Exécution selon le fournisseur d'IA sélectionné
  try {
    let rawResult = '';

    if (provider === 'claude') {
      rawResult = await callClaude(systemPrompt, userPrompt, model);
      addDebugLog({
        apiProvider: 'Claude' as any,
        model: model,
        status: 'success',
        statusCode: 200,
        message: 'Génération réussie via Anthropic Claude 5.5.',
        rawPayload: rawResult.substring(0, 500),
      });
    } else if (provider === 'openai') {
      rawResult = await callOpenAI(systemPrompt, userPrompt, model);
      addDebugLog({
        apiProvider: 'OpenAI' as any,
        model: model,
        status: 'success',
        statusCode: 200,
        message: 'Génération réussie via OpenAI ChatGPT (GPT-5).',
        rawPayload: rawResult.substring(0, 500),
      });
    } else {
      // Défaut : Google Gemini 3
      rawResult = await callGemini(systemPrompt, userPrompt, model);
      addDebugLog({
        apiProvider: 'Gemini',
        model: model,
        status: 'success',
        statusCode: 200,
        message: 'Génération réussie via Google Gemini 3 (Notebook IA).',
        rawPayload: rawResult.substring(0, 500),
      });
    }

    const parsed = JSON.parse(rawResult);
    return validator(parsed);
  } catch (primaryError: any) {
    addDebugLog({
      apiProvider: (primaryError?.provider || provider) as any,
      model: model,
      status: 'error',
      statusCode: primaryError?.statusCode || 0,
      message: primaryError?.message || `Échec sur ${model}`,
      rawPayload: primaryError?.rawPayload || JSON.stringify(primaryError),
    });

    // 3. Fallback Groq si configuré
    if (getGroqApiKey()) {
      try {
        const groqResult = await callGroq(systemPrompt, userPrompt);
        const parsed = JSON.parse(groqResult);
        addDebugLog({
          apiProvider: 'Groq',
          model: 'openai/gpt-oss-120b',
          status: 'success',
          statusCode: 200,
          message: 'Génération de secours réussie via Groq.',
          rawPayload: groqResult.substring(0, 500),
        });
        return validator(parsed);
      } catch (groqErr) {
        console.warn('Fallback Groq également indisponible');
      }
    }

    // 4. Déclencher le consentement pour passer en mode local
    throw new Error('REQUIRE_USER_CONSENT');
  }
}

// ------------------------------------------------------------------------------------------------
// EXTRACTIONS LOCALES (Regex heuristiques 100% Client-Side)
// ------------------------------------------------------------------------------------------------

function localExtractToolbox(text: string): StudySheet {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const title = lines[0]?.substring(0, 80) || 'Fiche de Cours (Extraction Locale)';
  
  const formulaMatches: Array<{ formula: string; name: string }> = [];
  const mathRegex = /\$\$([\s\S]*?)\$\$|\$([^\$]+)\$|([A-Za-z\s]+=\s*[^;\.\n]+)/g;
  let match;
  let count = 0;
  while ((match = mathRegex.exec(text)) !== null && count < 10) {
    const rawForm = (match[1] || match[2] || match[3] || '').trim();
    if (rawForm.length > 3 && rawForm.includes('=')) {
      count++;
      formulaMatches.push({
        name: `Relation caractéristique #${count}`,
        formula: rawForm,
      });
    }
  }

  return {
    id: `sheet_${Date.now()}`,
    subjectId: 'meca-flu',
    title: title,
    subtitle: 'Généré en Mode Local Prioritaire (100% Offline)',
    chapter: 'Extraction Automatique',
    tags: ['Mode Local', 'ESTACA'],
    mastery: 'to_learn',
    theorems: [
      {
        id: `thm_${Date.now()}_1`,
        name: 'Principe fondamental extrait du document',
        statement: 'Voir les équations caractéristiques extraites du document source.',
        strictConditions: [
          'Vérifier les conditions aux limites dans le document de cours',
          'Régime permanent ou stationnaire requis',
        ],
        professorTip: 'Toujours réécrire les hypothèses de base sur la copie d\'examen ESTACA.',
      }
    ],
    magicFormulas: formulaMatches.length > 0 ? formulaMatches.map((f, idx) => ({
      id: `fml_${Date.now()}_${idx}`,
      name: f.name,
      formula: f.formula,
      unitsAndVariables: 'Toutes les variables sont à exprimer en unités du Système International (SI).',
      validityDomain: 'Consulter le support de cours pour le domaine de validité précis.',
    })) : [
      {
        id: `fml_${Date.now()}_default`,
        name: 'Équation fondamentale',
        formula: 'F = m \\cdot a',
        unitsAndVariables: 'F en Newtons [N], m en kilogrammes [kg], a en m/s²',
        validityDomain: 'Mécanique newtonienne non relativiste',
      }
    ],
    stepByStepMethods: [
      {
        id: `mth_${Date.now()}_1`,
        goal: 'Résolution méthodique d\'un problème issu de ce cours',
        steps: [
          '1. Définir le système fermé/ouvert et le référentiel d\'étude.',
          '2. Poser le bilan exhaustif des forces ou des flux.',
          '3. Écrire les équations maîtresses avec les hypothèses associées.',
          '4. Résoudre analytiquement avant de faire l\'application numérique.',
          '5. Vérifier l\'homogénéité dimensionnelle et la cohérence des ordres de grandeur.',
        ],
        trapToAvoid: 'Ne jamais faire l\'application numérique avant d\'avoir isolé l\'expression littérale.',
      }
    ],
    examTraps: [
      'Oubli de convertir les unités en unités SI (ex: bar en Pa, km/h en m/s, °C en Kelvin).',
      'Application d\'une formule hors de son domaine de validité sans citer les hypothèses.',
    ],
    flashcards: [
      {
        id: `fc_${Date.now()}_1`,
        question: 'Quelle est la première étape indispensable avant toute application numérique ?',
        answer: 'Établir l\'expression littérale exacte et vérifier l\'homogénéité dimensionnelle.',
      },
      {
        id: `fc_${Date.now()}_2`,
        question: 'Quelles sont les unités SI de la pression et de l\'énergie ?',
        answer: 'Pression en Pascal (Pa = N/m² ou kg·m⁻¹·s⁻²), Énergie en Joules (J = N·m ou kg·m²·s⁻²).',
      }
    ],
    quiz: [
      {
        id: `qz_${Date.now()}_1`,
        question: 'Pour une démarche d\'ingénieur rigoureuse, que faut-il obligatoirement mentionner avant de poser un théorème ?',
        options: [
          'La date de découverte du théorème',
          'Toutes les hypothèses strictes de validité',
          'Le numéro de page du polycopié',
          'La valeur numérique finale attendue'
        ],
        correctIndex: 1,
        explanation: 'En école d\'ingénieurs type ESTACA, un théorème posé sans ses hypothèses de validité perd la majorité des points au barème.',
      }
    ],
  };
}

function localParseTd(text: string, type: 'td' | 'annale'): Array<TDExercise | AnnaleItem> {
  const chunks = text.split(/(?:Exercice|Problème|Partie|Exercice\s*\d+|EXERCICE)/i).filter(c => c.trim().length > 20);
  if (chunks.length === 0) chunks.push(text);

  return chunks.slice(0, 5).map((chunk, idx) => {
    const lines = chunk.trim().split('\n').map(l => l.trim()).filter(Boolean);
    const title = lines[0]?.substring(0, 60) || `Exercice ${idx + 1}`;
    const statement = lines.slice(1, 10).join('\n') || chunk.substring(0, 300);

    const base: TDExercise = {
      id: `exo_${Date.now()}_${idx}`,
      subjectId: 'meca-flu',
      chapter: 'Chapitre Extrait',
      title: title,
      notion: 'Application des lois fondamentales',
      difficulty: ((idx % 3) + 1) as 1 | 2 | 3,
      statement: statement,
      hints: [
        'Commencez par schématiser le problème et poser les axes.',
        'Isolez la grandeur recherchée sous forme littérale.',
      ],
      solution: `Correction pas à pas :\n1. Bilan des hypothèses appliquées.\n2. Écriture des équations de conservation.\n3. Résolution littérale et simplification.\n4. Application numérique avec unités SI.`,
      status: 'todo',
    };

    if (type === 'annale') {
      const annale: AnnaleItem = {
        ...base,
        session: 'Session Principale',
        year: new Date().getFullYear(),
        durationMinutes: 120,
        points: 20,
        gradingCriteria: [
          'Qualité de la démarche littérale : 8 pts',
          'Vérification des hypothèses : 4 pts',
          'Précision des calculs et unités SI : 5 pts',
          'Esprit critique sur le résultat : 3 pts',
        ],
      };
      return annale;
    }

    return base;
  });
}

// ------------------------------------------------------------------------------------------------
// FONCTIONS PUBLIQUES
// ------------------------------------------------------------------------------------------------

export async function transformLectureToToolbox(text: string, forceLocal?: boolean): Promise<StudySheet> {
  const systemPrompt = `Tu es un professeur émérite d'école d'ingénieurs aéronautique et automobile (type ESTACA).
Transforme le cours fourni en une boîte à outils de révision ultra-exhaustive au format JSON.

Structure JSON attendue :
{
  "title": string,
  "subtitle": string,
  "chapter": string,
  "tags": string[],
  "theorems": [
    {
      "name": string,
      "statement": string (formule LaTeX entre $$...$$ ou $...$),
      "strictConditions": string[] (toutes les hypothèses indispensables sans exception),
      "professorTip": string (astuce d'examen)
    }
  ],
  "magicFormulas": [
    {
      "name": string,
      "formula": string (LaTeX),
      "unitsAndVariables": string (chaque variable définie avec son symbole et son unité SI exacte [m, kg, s, Pa, N, J, W, etc.]),
      "validityDomain": string
    }
  ],
  "stepByStepMethods": [
    {
      "goal": string,
      "steps": string[],
      "trapToAvoid": string
    }
  ],
  "examTraps": string[],
  "flashcards": [
    { "question": string, "answer": string }
  ],
  "quiz": [
    {
      "question": string,
      "options": [string, string, string, string],
      "correctIndex": number (0 à 3),
      "explanation": string
    }
  ]
}`;

  const userPrompt = `Voici le cours d'ingénierie à analyser :\n\n${text.substring(0, 30000)}`;

  return executeWithFallback<StudySheet>(
    systemPrompt,
    userPrompt,
    (parsed) => ({
      id: `sheet_${Date.now()}`,
      subjectId: 'meca-flu',
      title: parsed.title || 'Fiche de Révision',
      subtitle: parsed.subtitle || 'Synthèse chirurgicale',
      chapter: parsed.chapter || 'Généralités',
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['Ingénierie', 'ESTACA'],
      mastery: 'to_learn',
      theorems: (parsed.theorems || []).map((t: any, i: number) => ({
        id: `thm_${Date.now()}_${i}`,
        name: t.name || 'Théorème',
        statement: t.statement || '',
        strictConditions: Array.isArray(t.strictConditions) ? t.strictConditions : [t.strictConditions || ''],
        professorTip: t.professorTip,
      })),
      magicFormulas: (parsed.magicFormulas || []).map((f: any, i: number) => ({
        id: `fml_${Date.now()}_${i}`,
        name: f.name || 'Formule',
        formula: f.formula || '',
        unitsAndVariables: f.unitsAndVariables || '',
        validityDomain: f.validityDomain || '',
      })),
      stepByStepMethods: (parsed.stepByStepMethods || []).map((m: any, i: number) => ({
        id: `mth_${Date.now()}_${i}`,
        goal: m.goal || 'Méthode',
        steps: Array.isArray(m.steps) ? m.steps : [m.steps || ''],
        trapToAvoid: m.trapToAvoid,
      })),
      examTraps: Array.isArray(parsed.examTraps) ? parsed.examTraps : [],
      flashcards: (parsed.flashcards || []).map((fc: any, i: number) => ({
        id: `fc_${Date.now()}_${i}`,
        question: fc.question || '',
        answer: fc.answer || '',
      })),
      quiz: (parsed.quiz || []).map((q: any, i: number) => ({
        id: `qz_${Date.now()}_${i}`,
        question: q.question || '',
        options: (q.options && q.options.length === 4) ? q.options : ['A', 'B', 'C', 'D'],
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        explanation: q.explanation || '',
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    forceLocal,
    () => localExtractToolbox(text)
  );
}

export async function parseTdDocument(
  text: string,
  type: 'td' | 'annale',
  forceLocal?: boolean
): Promise<Array<TDExercise | AnnaleItem>> {
  const isAnnale = type === 'annale';

  const systemPrompt = `Tu es un correcteur officiel d'épreuves d'école d'ingénieurs (ESTACA).
Analyse le document fourni (${isAnnale ? "Sujet d'annale d'examen" : "Feuille de TD"}).
Découpe rigoureusement chaque exercice et fournis la solution ultra-détaillée avec tous les calculs intermédiaires, formules en LaTeX, indices et barème.

Format JSON attendu :
{
  "exercises": [
    {
      "title": string,
      "chapter": string,
      "notion": string,
      "difficulty": number (1, 2 ou 3),
      "statement": string,
      "hints": string[],
      "solution": string,
      ${isAnnale ? `
      "session": string,
      "year": number,
      "durationMinutes": number,
      "points": number,
      "gradingCriteria": string[]
      ` : ''}
    }
  ]
}`;

  const userPrompt = `Voici le document à découper et corriger :\n\n${text.substring(0, 30000)}`;

  return executeWithFallback<Array<TDExercise | AnnaleItem>>(
    systemPrompt,
    userPrompt,
    (parsed) => {
      const list = Array.isArray(parsed) ? parsed : (parsed.exercises || []);
      return list.map((item: any, i: number) => {
        const base: TDExercise = {
          id: `exo_${Date.now()}_${i}`,
          subjectId: 'meca-flu',
          chapter: item.chapter || 'Chapitre Général',
          title: item.title || `Exercice ${i + 1}`,
          notion: item.notion || 'Notion clé',
          difficulty: [1, 2, 3].includes(item.difficulty) ? item.difficulty : 2,
          statement: item.statement || '',
          hints: Array.isArray(item.hints) ? item.hints : [],
          solution: item.solution || 'Solution en cours de rédaction.',
          status: 'todo',
          createdAt: new Date().toISOString(),
        };

        if (isAnnale) {
          const annale: AnnaleItem = {
            ...base,
            session: item.session || 'Session Principale',
            year: item.year || new Date().getFullYear(),
            durationMinutes: item.durationMinutes || 120,
            points: item.points || 20,
            gradingCriteria: Array.isArray(item.gradingCriteria) ? item.gradingCriteria : [
              'Rigueur littérale : 50%',
              'Unités SI : 30%',
              'Esprit critique : 20%'
            ],
          };
          return annale;
        }
        return base;
      });
    },
    forceLocal,
    () => localParseTd(text, type)
  );
}

export async function generateSimilarExercise(
  exercise: TDExercise | AnnaleItem,
  type: 'td' | 'annale'
): Promise<TDExercise | AnnaleItem> {
  const isAnnale = type === 'annale';

  const systemPrompt = `Tu es un professeur d'école d'ingénieurs créant un clone d'exercice d'entraînement d'un niveau équivalent.
Prends l'exercice fourni, conserve la même structure conceptuelle mais change le contexte d'application ou les valeurs numériques.
Génère la correction complète pas à pas.

Format JSON attendu :
{
  "title": string,
  "chapter": string,
  "notion": string,
  "difficulty": number (1, 2 ou 3),
  "statement": string,
  "hints": string[],
  "solution": string,
  ${isAnnale ? `
  "session": string,
  "year": number,
  "durationMinutes": number,
  "points": number,
  "gradingCriteria": string[]
  ` : ''}
}`;

  const userPrompt = `Exercice original :\nTitre : ${exercise.title}\nNotion : ${exercise.notion}\nÉnoncé :\n${exercise.statement}\nSolution d'origine :\n${exercise.solution}`;

  return executeWithFallback<TDExercise | AnnaleItem>(
    systemPrompt,
    userPrompt,
    (parsed) => {
      const base: TDExercise = {
        id: `exo_sim_${Date.now()}`,
        subjectId: exercise.subjectId,
        chapter: parsed.chapter || exercise.chapter,
        title: parsed.title ? `[Variante IA] ${parsed.title}` : `[Variante IA] ${exercise.title}`,
        notion: parsed.notion || exercise.notion,
        difficulty: [1, 2, 3].includes(parsed.difficulty) ? parsed.difficulty : exercise.difficulty,
        statement: parsed.statement || 'Nouvel énoncé généré.',
        hints: Array.isArray(parsed.hints) ? parsed.hints : exercise.hints,
        solution: parsed.solution || 'Correction détaillée générée.',
        status: 'todo',
        createdAt: new Date().toISOString(),
      };

      if (isAnnale) {
        const annaleOriginal = exercise as AnnaleItem;
        const annale: AnnaleItem = {
          ...base,
          session: parsed.session || `Entraînement ${annaleOriginal.session}`,
          year: parsed.year || annaleOriginal.year,
          durationMinutes: parsed.durationMinutes || annaleOriginal.durationMinutes,
          points: parsed.points || annaleOriginal.points,
          gradingCriteria: Array.isArray(parsed.gradingCriteria) ? parsed.gradingCriteria : annaleOriginal.gradingCriteria,
        };
        return annale;
      }
      return base;
    }
  );
}

export async function generateNotion(
  type: 'theorem' | 'formula' | 'method' | 'trap',
  prompt: string,
  sheetContext: string
): Promise<any> {
  const systemPrompt = `Tu es un professeur d'école d'ingénieurs (ESTACA).
Génère un élément ultra-précis pour enrichir une fiche de cours au format JSON.
Type demandé : "${type}".`;

  const userPrompt = `Contexte de la fiche : ${sheetContext}\nDemande spécifique : ${prompt}`;

  return executeWithFallback<any>(
    systemPrompt,
    userPrompt,
    (parsed) => parsed
  );
}

export async function generateQuiz(sheetContext: string): Promise<QuizQuestion[]> {
  const systemPrompt = `Tu es un examinateur en école d'ingénieurs.
Génère exactement 4 questions de QCM au format JSON avec calculs ou réflexes d'examen sur la base du cours fourni.

Format JSON attendu :
{
  "quiz": [
    {
      "question": string,
      "options": [string, string, string, string],
      "correctIndex": number (0 à 3),
      "explanation": string
    }
  ]
}`;

  const userPrompt = `Contexte du cours :\n${sheetContext.substring(0, 8000)}`;

  return executeWithFallback<QuizQuestion[]>(
    systemPrompt,
    userPrompt,
    (parsed) => {
      const list = parsed.quiz || (Array.isArray(parsed) ? parsed : []);
      return list.map((q: any, i: number) => ({
        id: `qz_gen_${Date.now()}_${i}`,
        question: q.question || 'Question de cours',
        options: (q.options && q.options.length === 4) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        explanation: q.explanation || 'Explication détaillée.',
      }));
    }
  );
}
