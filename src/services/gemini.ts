import { Scene, BreakdownItem, BreakdownCategory, Language } from '../types/production';

const DEFAULT_API_KEY = 'AIzaSyC4IToJfBc2aPagi3O9-WWBaEmhVLbEhX8';
const STORAGE_KEY = 'cinebreak_gemini_api_key';
const MODEL_KEY = 'cinebreak_gemini_model';
const DEFAULT_MODEL = 'gemini-3.6-flash';

export function getApiKey(): string {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved || saved.trim() === '') {
    return DEFAULT_API_KEY;
  }
  return saved;
}

export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key.trim());
}

export function getSelectedModel(): string {
  const saved = localStorage.getItem(MODEL_KEY);
  // Auto-upgrade deprecated or invalid models
  if (!saved || saved.includes('1.5') || saved.includes('2.5') || saved.includes('pro-latest')) {
    return DEFAULT_MODEL;
  }
  return saved;
}

export function setSelectedModel(model: string): void {
  localStorage.setItem(MODEL_KEY, model);
}

/**
 * Normalizes any category string from Gemini into a valid BreakdownCategory enum.
 */
function normalizeCategory(cat: string): BreakdownCategory {
  if (!cat) return 'PROPS';
  const c = cat.trim().toUpperCase().replace(/[\s\-_]+/g, '_');
  if (c.includes('CAST') || c.includes('CHARACTER') || c.includes('ACTOR')) return 'CAST';
  if (c.includes('EXTRA') || c.includes('BACKGROUND') || c.includes('CROWD')) return 'EXTRAS';
  if (c.includes('STUNT') || c.includes('FIGHT') || c.includes('ACTION')) return 'STUNTS';
  if (c.includes('VEHICLE') || c.includes('CAR') || c.includes('BIKE')) return 'VEHICLES';
  if (c.includes('PROP') || c.includes('WEAPON')) return 'PROPS';
  if (c.includes('SFX') || c.includes('SPECIAL_EFFECT') || c.includes('EFFECT')) return 'SFX';
  if (c.includes('WARDROBE') || c.includes('COSTUME') || c.includes('DRESS')) return 'WARDROBE';
  if (c.includes('MAKEUP') || c.includes('HAIR') || c.includes('PROSTHETIC')) return 'MAKEUP';
  if (c.includes('ANIMAL') || c.includes('PET') || c.includes('HORSE')) return 'ANIMALS';
  if (c.includes('SOUND') || c.includes('AUDIO') || c.includes('MUSIC')) return 'SOUND';
  if (c.includes('SET_DRESSING') || c.includes('SET') || c.includes('DRESSING')) return 'SET_DRESSING';
  if (c.includes('GREENERY') || c.includes('PLANT') || c.includes('FLOWER')) return 'GREENERY';
  if (c.includes('SPECIAL_EQUIPMENT') || c.includes('CAMERA') || c.includes('RIG') || c.includes('DRONE') || c.includes('EQUIPMENT')) return 'SPECIAL_EQUIPMENT';
  if (c.includes('LIGHTING') || c.includes('GRIP') || c.includes('LAMP')) return 'LIGHTING_GRIP';
  if (c.includes('SAFETY') || c.includes('HAZARD') || c.includes('MEDIC') || c.includes('SECURITY')) return 'SAFETY';
  return 'PROPS';
}

/**
 * Tests Gemini API key connectivity.
 */
export async function testGeminiApiKey(apiKey?: string): Promise<{ success: boolean; message: string }> {
  const key = apiKey || getApiKey();
  if (!key) {
    return { success: false, message: 'No API key provided.' };
  }

  const model = getSelectedModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  try {
    const startTime = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: 'Respond with the word "CONNECTED" only.' }],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData.error?.message || `HTTP ${res.status}: Failed to authenticate with Gemini API.`,
      };
    }

    const elapsed = Date.now() - startTime;
    return { success: true, message: `Connected to Google Gemini (${model}) in ${elapsed}ms!` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error connecting to Gemini.' };
  }
}

export interface BreakdownAIResponse {
  synopsis: string;
  synopsisTa?: string;
  items: Array<{
    category: BreakdownCategory;
    name: string;
    nameTa?: string;
    description?: string;
    descriptionTa?: string;
    count?: number;
  }>;
}

/**
 * Performs complete 1st AD scene breakdown using Gemini AI.
 * Understands both English and Tamil scripts seamlessly.
 */
import { translateToTamil, translateDescriptionToTamil } from './tamilTranslator';

export async function breakdownSceneWithGemini(
  scene: Scene,
  language: Language = 'en'
): Promise<BreakdownAIResponse> {
  const key = getApiKey();
  const model = getSelectedModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const isTamil = language === 'ta';

  const prompt = `
You are an elite Hollywood & Kollywood 1st Assistant Director (1st AD) and Line Producer specializing in professional script breakdown.
Analyze the following screenplay scene thoroughly and extract every single production requirement.

SCENE METADATA:
Scene Number: ${scene.sceneNumber}
Slugline: ${scene.rawHeading}
Location: ${scene.location}
Time: ${scene.timeOfDay}

SCENE TEXT:
${scene.rawScript || scene.synopsis || scene.rawHeading}

YOUR TASK:
Extract all production elements and classify them strictly into these 15 categories:
- CAST (Speaking characters)
- EXTRAS (Background atmosphere, crowd counts)
- STUNTS (Action choreography, wire stunts, fight sequences, falls, safety)
- VEHICLES (Picture cars, hero bikes, chase vehicles)
- PROPS (Hand props, weapons, items held or used by actors)
- SFX (Special effects: practical rain, smoke, fire, squibs, explosions)
- WARDROBE (Specific costumes, tactical suits, traditional Tamil attire, changes)
- MAKEUP (Wounds, blood levels, prosthetics, aging, tattoos)
- ANIMALS (Horses, dogs, temple animals, handlers)
- SOUND (Foley cues, specific practical audio, sirens, gunshots)
- SET_DRESSING (Furniture, posters, banners, festival decor)
- GREENERY (Plants, jungle foliage, temple flowers)
- SPECIAL_EQUIPMENT (Steadicam, drone, high-speed camera, underwater rig, crane)
- LIGHTING_GRIP (Night lighting, moonlight rigs, torches, neon practicals)
- SAFETY (Fire permits, road closures, height safety, crowd control)

LANGUAGE INSTRUCTION:
${
  isTamil
    ? `CRITICAL MANDATORY INSTRUCTION: The user has selected the TAMIL EDITION of the software.
All character names, prop names, stunt descriptions, vehicle names, wardrobe, makeup, equipment, synopsis, and descriptions MUST be 100% in pure TAMIL (தமிழ்) script.
Do NOT output English strings for names or descriptions.
Example:
- Name: "வெள்ளி கைப்பிடி வெட்டருவாள்"
- Name: "ஆதி"
- Name: "20 சண்டைக் கலைஞர்கள் / ரவுடிகள்"
- Name: "3 கறுப்பு பொலிரோ கார்கள்"
- Name: "செயற்கை மழை இயந்திரம்"`
    : `Provide comprehensive English names and Tamil translations for "nameTa" and "descriptionTa" where applicable.`
}

RESPONSE FORMAT:
You MUST respond with pure JSON only:
{
  "synopsis": "${isTamil ? 'காட்சியின் சுருக்கம் தமிழில்' : 'Concise 1-2 sentence dramatic summary'}",
  "synopsisTa": "காட்சியின் சுருக்கம் தமிழில்",
  "items": [
    {
      "category": "CAST",
      "name": "${isTamil ? 'தமிழில் பெயர்' : 'Character Name'}",
      "nameTa": "தமிழில் பெயர்",
      "description": "${isTamil ? 'விவரம் தமிழில்' : 'Logistical role or note'}",
      "descriptionTa": "விவரம் தமிழில்",
      "count": 1
    }
  ]
}
`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.95,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API error (HTTP ${res.status})`);
    }

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const candidateText = parts.find((p: any) => p.text)?.text || '';
    if (!candidateText) {
      throw new Error('No response returned from Gemini.');
    }

    // Robust JSON extraction
    let parsed: BreakdownAIResponse | null = null;
    const jsonBlockMatch = candidateText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const rawJsonCandidate = jsonBlockMatch ? jsonBlockMatch[1] : candidateText;
    const objectMatch = rawJsonCandidate.match(/\{[\s\S]*\}/);

    if (objectMatch) {
      parsed = JSON.parse(objectMatch[0]);
    } else {
      parsed = JSON.parse(candidateText.trim());
    }

    if (parsed && Array.isArray(parsed.items)) {
      parsed.items = parsed.items.map((item) => {
        const cat = normalizeCategory(item.category);
        const nameTa = item.nameTa || translateToTamil(item.name);
        const descTa = item.descriptionTa || translateDescriptionToTamil(item.description);

        return {
          ...item,
          category: cat,
          name: isTamil ? nameTa : item.name,
          nameTa: nameTa,
          description: isTamil ? descTa : item.description,
          descriptionTa: descTa,
          count: item.count || 1,
        };
      });

      if (isTamil) {
        parsed.synopsis = parsed.synopsisTa || translateToTamil(parsed.synopsis);
      }

      return parsed;
    }

    throw new Error('Malformed JSON structure from Gemini.');
  } catch (err: any) {
    console.error('Gemini breakdown error, using smart fallback:', err);
    // Fallback: heuristic extraction so user is never blocked
    return fallbackHeuristicBreakdown(scene, language);
  }
}

/**
 * Interactive Copilot assistant for film production questions.
 */
export async function askProductionCopilot(
  userQuestion: string,
  scenes: Scene[],
  language: Language = 'en'
): Promise<string> {
  const key = getApiKey();
  const model = getSelectedModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const sceneSummaries = scenes.map((s) => `Scene ${s.sceneNumber}: ${s.rawHeading} (${s.formattedPages} pgs) - ${s.synopsis}`).join('\n');

  const systemContext = `
You are CineBreak AI, an elite 1st Assistant Director (1st AD), Line Producer, and Film Pre-Production Consultant with deep expertise in Hollywood production standards and Kollywood (Tamil cinema) filmmaking traditions.

PROJECT SCENES OVERVIEW:
${sceneSummaries}

USER QUESTION:
${userQuestion}

LANGUAGE REQUIREMENT:
Respond in ${language === 'ta' ? 'Tamil (தமிழ்) with rich cinema production terminology' : 'English with Tamil cinema context where applicable'}.
Be concise, practical, structured with bullet points, and directly actionable for the director and line producer.
`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemContext }] }],
        generationConfig: { temperature: 0.4 },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API error (HTTP ${res.status})`);
    }

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find((p: any) => p.text)?.text || '';
    return textPart || 'No response generated.';
  } catch (err: any) {
    return `Error connecting to Gemini Copilot: ${err.message}. Please check your API key settings.`;
  }
}

/**
 * Intelligent client-side heuristic fallback in case offline or API rate limit.
 */
function fallbackHeuristicBreakdown(scene: Scene, language: Language): BreakdownAIResponse {
  const items: BreakdownAIResponse['items'] = [];
  const text = scene.rawScript || scene.rawHeading;

  // Extract characters from elements
  const characters = scene.elements
    .filter((e) => e.type === 'CHARACTER')
    .map((e) => e.text.replace(/\(.*\)/, '').trim());
  const uniqueChars = Array.from(new Set(characters));

  uniqueChars.forEach((c) => {
    items.push({
      category: 'CAST',
      name: c,
      nameTa: c,
      description: 'Speaking character in scene',
      descriptionTa: 'காட்சியில் பேசும் கதாபாத்திரம்',
      count: 1,
    });
  });

  // Heuristic props
  const propKeywords = ['gun', 'phone', 'knife', 'briefcase', 'laptop', 'bottle', 'key', 'file', 'bag', 'வாள்', 'துப்பாக்கி', 'போன்', 'பணம்', 'கத்தி'];
  propKeywords.forEach((kw) => {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(text)) {
      items.push({
        category: 'PROPS',
        name: kw.toUpperCase(),
        nameTa: kw,
        description: 'Action prop identified in scene script',
        count: 1,
      });
    }
  });

  // Heuristic stunts
  if (/chase|fight|jump|explosion|punch|crash|சண்டை|பாய்ந்து|வெடி/i.test(text)) {
    items.push({
      category: 'STUNTS',
      name: 'Action Choreography & Wire Work',
      nameTa: 'சண்டைப் பயிற்சி & கயிறு வேலை',
      description: 'Physical stunt or combat sequence requiring safety pads',
      count: 1,
    });
  }

  // Camera rigs
  if (scene.timeOfDay === 'NIGHT' || scene.timeOfDay === 'இரவு') {
    items.push({
      category: 'LIGHTING_GRIP',
      name: 'Night Exterior HMI & Moonlight Rig',
      nameTa: 'இரவு நேர விளக்கு அமைப்புகள்',
      description: 'High output lighting for night ambience',
      count: 1,
    });
  }

  return {
    synopsis: scene.synopsis || scene.rawHeading,
    synopsisTa: scene.synopsis || scene.rawHeading,
    items,
  };
}

/**
 * AI Screenplay Understanding & Automatic Scene Sectioning Engine
 * Analyzes raw unstructured or semi-structured screenplay text (Tamil/English/Bamini)
 * and automatically sections it into industry-standard scenes with elements and sluglines.
 */
import { convertToUnicode, isLegacyBamini } from './tamilTranscoder';
import { parseScreenplay, formatEighths } from './scriptParser';

export async function autoSectionAndFormatScreenplayWithAI(
  rawScript: string,
  language: Language = 'ta'
): Promise<Scene[]> {
  if (!rawScript || !rawScript.trim()) return [];

  // Step 1: Transcode if legacy Bamini font detected
  const cleanedScript = isLegacyBamini(rawScript) ? convertToUnicode(rawScript, true) : rawScript;

  const key = getApiKey();
  const model = getSelectedModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const prompt = `
You are an expert Hollywood & Kollywood Screenplay Script Supervisor, Script Editor, and 1st Assistant Director (1st AD).
Analyze the following screenplay text thoroughly. Understand the narrative, identify every scene transition, location change, time change, character dialogue, parenthetical, action paragraph, and transition.

RAW SCREENPLAY TEXT:
${cleanedScript.slice(0, 30000)}

YOUR TASK:
1. Divide the screenplay into structured, numbered scenes.
2. For every scene extract:
   - sceneNumber: "1", "2", "3", etc.
   - intExt: "உள்" (INT), "வெளி" (EXT), or "உள்/வெளி" (INT/EXT).
   - location: The location name in Tamil (e.g. "ஆந்திரா காடு", "சேலம் காடு", "ஜெயராமன் வீடு", "ஒயின் ஷாப்").
   - timeOfDay: "பகல்" (DAY), "இரவு" (NIGHT), "மாலை" (EVENING), or "விடியல்" (DAWN).
   - rawHeading: Standardized slugline heading (e.g. "காட்சி 1: வெளி. ஆந்திரா காடு - இரவு").
   - synopsis: 1-2 sentence summary of what happens in the scene.
   - elements: Array of screenplay elements with exact type:
     * "SLUGLINE": Scene heading text
     * "CHARACTER": Speaking character name in uppercase (e.g. "ரங்கா", "சீதா", "சுரேஷ்", "போலீஸ்")
     * "PARENTHETICAL": Stage direction (e.g. "(சிரித்தபடி)", "(கோபமாக)")
     * "DIALOGUE": What the character says
     * "ACTION": Action descriptions, environment details, or camera notes
     * "TRANSITION": Transitions like "CUT TO:", "FADE OUT.", "DISSOLVE TO:", "இடைவேளை", "முற்றும்"

OUTPUT FORMAT (JSON ONLY):
{
  "scenes": [
    {
      "sceneNumber": "1",
      "intExt": "வெளி",
      "location": "ஆந்திரா காடு",
      "timeOfDay": "இரவு",
      "rawHeading": "காட்சி 1: வெளி. ஆந்திரா காடு - இரவு",
      "synopsis": "ஆந்திரா காட்டில் செம்மரம் கடத்தும் கும்பலை போலீஸ் துரத்தி பிடிப்பது.",
      "elements": [
        { "type": "SLUGLINE", "text": "காட்சி 1: வெளி. ஆந்திரா காடு - இரவு" },
        { "type": "ACTION", "text": "வானம் இடி இடிக்க. கடினமான மழை பெய்து கொண்டிருக்கிறது." },
        { "type": "CHARACTER", "text": "ரங்கா" },
        { "type": "DIALOGUE", "text": "சீக்கிரம் கட்டையை வண்டில ஏத்துங்கடா!" }
      ]
    }
  ]
}
`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API HTTP ${res.status}`);
    }

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find((p: any) => p.text)?.text || '{}';
    const parsed = JSON.parse(textPart);

    if (parsed.scenes && Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
      return parsed.scenes.map((s: any, idx: number) => {
        const elementCount = s.elements?.length || 10;
        const eighths = Math.max(1, Math.ceil((elementCount / 26) * 8));

        return {
          id: `scene-${Date.now()}-${idx + 1}`,
          sceneNumber: String(s.sceneNumber || idx + 1),
          intExt: s.intExt || 'உள்/வெளி',
          location: s.location || 'காடு / இடம்',
          locationTa: s.location || 'காடு / இடம்',
          timeOfDay: s.timeOfDay || 'பகல்',
          rawHeading: s.rawHeading || `காட்சி ${idx + 1}: ${s.location || ''} - ${s.timeOfDay || ''}`,
          pagesEighths: eighths,
          formattedPages: formatEighths(eighths),
          synopsis: s.synopsis || '',
          synopsisTa: s.synopsis || '',
          rawScript: (s.elements || []).map((e: any) => e.text).join('\n'),
          elements: (s.elements || []).map((e: any, elIdx: number) => ({
            id: `el-${idx}-${elIdx}`,
            type: e.type || 'ACTION',
            text: e.text || '',
          })),
          breakdownItems: [],
          shootingDay: Math.ceil((idx + 1) / 4),
        };
      });
    }

    // If structure wasn't valid, use deterministic parser
    return parseScreenplay(cleanedScript);
  } catch (err) {
    console.warn('AI Scene Sectioning fallback to deterministic engine:', err);
    return parseScreenplay(cleanedScript);
  }
}
