import { Scene, BreakdownItem, BreakdownCategory, Language, ScriptElement } from '../types/production';
import { getApiKey, getSelectedModel } from './gemini';
import { formatEighths, parseScreenplay } from './scriptParser';
import { translateToTamil, translateDescriptionToTamil } from './tamilTranslator';

export type AgentActionType =
  | 'NAVIGATE_SCENE'
  | 'NAVIGATE_PAGE'
  | 'UPDATE_SCENE_METADATA'
  | 'EDIT_SCENE_ELEMENTS'
  | 'INSERT_NEW_SCENE'
  | 'SPLIT_SCENE'
  | 'MERGE_SCENES'
  | 'DELETE_SCENE'
  | 'RENUMBER_SCENES'
  | 'ADD_BREAKDOWN_ITEM'
  | 'REMOVE_BREAKDOWN_ITEM'
  | 'SET_VIEW_SETTINGS'
  | 'POLISH_DIALOGUE'
  | 'TRANSLATE_SCENE'
  | 'GENERAL_INSIGHT';

export interface ViewSettings {
  fontSize?: number;
  lineSpacing?: '1.0' | '1.15' | '1.5' | '2.0';
  zoom?: number;
  pageSize?: 'A4' | 'LETTER' | 'LEGAL';
  margins?: 'STANDARD' | 'SCREENPLAY' | 'NARROW';
  viewMode?: 'continuous' | 'single';
}

export interface AgentExecutionResult {
  actionType: AgentActionType;
  status: 'SUCCESS' | 'INFO' | 'ERROR';
  badgeTitle: string;
  summary: string;
  explanation?: string;
  updatedScenes?: Scene[];
  targetSceneIndex?: number;
  targetPageIndex?: number;
  updatedViewSettings?: ViewSettings;
  canUndo?: boolean;
  previousScenes?: Scene[];
}

/**
 * Normalizes category to BreakdownCategory
 */
function normalizeBreakdownCategory(cat: string): BreakdownCategory {
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
 * Helper to extract comprehensive screenplay intelligence and stats
 */
export function extractScreenplayIntelligence(scenes: Scene[]) {
  const characterSceneMap = new Map<string, number[]>();
  const locationSceneMap = new Map<string, string[]>();
  const stuntsList: { sceneNumber: string; description: string }[] = [];
  const propsList: { sceneNumber: string; name: string }[] = [];
  let dayScenes = 0;
  let nightScenes = 0;
  let intScenes = 0;
  let extScenes = 0;

  scenes.forEach((s, idx) => {
    const scNum = s.sceneNumber || String(idx + 1);

    // Characters from script elements
    (s.elements || []).forEach((el) => {
      if (el.type === 'CHARACTER') {
        const name = el.text.replace(/\(.*\)/, '').trim().toUpperCase();
        if (name && name.length >= 2) {
          if (!characterSceneMap.has(name)) characterSceneMap.set(name, []);
          const list = characterSceneMap.get(name)!;
          if (!list.includes(idx + 1)) list.push(idx + 1);
        }
      }
    });

    // Breakdown Items
    (s.breakdownItems || []).forEach((b) => {
      if (b.category === 'CAST' && b.name) {
        const name = b.name.trim().toUpperCase();
        if (!characterSceneMap.has(name)) characterSceneMap.set(name, []);
        const list = characterSceneMap.get(name)!;
        if (!list.includes(idx + 1)) list.push(idx + 1);
      }
      if (b.category === 'STUNTS') {
        stuntsList.push({ sceneNumber: scNum, description: b.name });
      }
      if (b.category === 'PROPS' || b.category === 'VEHICLES') {
        propsList.push({ sceneNumber: scNum, name: b.name });
      }
    });

    // Locations
    const loc = s.location?.trim() || 'Unknown Location';
    if (!locationSceneMap.has(loc)) locationSceneMap.set(loc, []);
    locationSceneMap.get(loc)!.push(scNum);

    // Time
    if (s.timeOfDay?.toUpperCase().includes('NIGHT') || s.timeOfDay?.includes('இரவு')) {
      nightScenes++;
    } else {
      dayScenes++;
    }

    // Int/Ext
    if (s.intExt?.toUpperCase().includes('INT') || s.intExt?.includes('உள்')) {
      intScenes++;
    } else {
      extScenes++;
    }
  });

  const characters = Array.from(characterSceneMap.entries())
    .map(([name, scList]) => ({
      name,
      sceneCount: scList.length,
      scenes: scList,
    }))
    .sort((a, b) => b.sceneCount - a.sceneCount);

  return {
    totalScenes: scenes.length,
    totalCharacters: characters.length,
    characters,
    dayScenes,
    nightScenes,
    intScenes,
    extScenes,
    locations: Array.from(locationSceneMap.entries()).map(([location, sceneList]) => ({
      location,
      count: sceneList.length,
      scenes: sceneList,
    })),
    stuntsList,
    propsList,
  };
}

/**
 * Helper to find a scene by sceneNumber or index
 */
function findSceneIndex(scenes: Scene[], identifier?: string | number): number {
  if (identifier === undefined || identifier === null) return -1;
  const strId = String(identifier).trim().toLowerCase();
  const idx = scenes.findIndex(
    (s) =>
      s.sceneNumber.toLowerCase() === strId ||
      s.sceneNumber.toLowerCase() === `sc.${strId}` ||
      s.sceneNumber.toLowerCase() === `scene ${strId}`
  );
  if (idx !== -1) return idx;

  const num = parseInt(strId, 10);
  if (!isNaN(num) && num >= 1 && num <= scenes.length) {
    return num - 1;
  }
  return -1;
}

/**
 * Executes an Agent Command by calling Gemini AI or Fallback Heuristic
 */
export async function executeScriptAgentCommand(
  userPrompt: string,
  currentSceneIndex: number,
  scenes: Scene[],
  viewSettings: ViewSettings,
  language: Language = 'en'
): Promise<AgentExecutionResult> {
  const isTamil = language === 'ta';
  const currentScene = scenes[currentSceneIndex] || scenes[0];

  const key = getApiKey();
  const model = getSelectedModel();

  const previousScenesSnapshot = JSON.parse(JSON.stringify(scenes));
  const intel = extractScreenplayIntelligence(scenes);

  const sceneSummaries = scenes.map((s, idx) => ({
    index: idx,
    sceneNumber: s.sceneNumber,
    heading: s.rawHeading,
    intExt: s.intExt,
    location: s.location,
    timeOfDay: s.timeOfDay,
    page: s.startPage || 1,
    synopsis: s.synopsis,
    charactersInScene: (s.elements || [])
      .filter((e) => e.type === 'CHARACTER')
      .map((e) => e.text)
      .slice(0, 6),
  }));

  const systemPrompt = `
You are CineBreak AI, an elite Hollywood & Kollywood Screenplay Script Assistant and Production Intelligence Agent.
The user is viewing their screenplay and asking you to either:
A) Perform an action (e.g. jump to scene/page, edit metadata, split/merge scenes, renumber scenes, add props/stunts, change font/zoom)
B) Answer ANY question about the screenplay (e.g. "how many characters?", "who are the main characters?", "summarize scene 3", "list all night scenes", "explain the plot", "what stunts are required?")

SCREENPLAY INTELLIGENCE DATA:
- Total Scenes: ${intel.totalScenes} (Day: ${intel.dayScenes}, Night: ${intel.nightScenes}, INT: ${intel.intScenes}, EXT: ${intel.extScenes})
- Total Characters Identified (${intel.totalCharacters}): ${JSON.stringify(intel.characters.slice(0, 25))}
- Locations (${intel.locations.length}): ${JSON.stringify(intel.locations.slice(0, 15))}
- Stunts: ${JSON.stringify(intel.stuntsList.slice(0, 10))}
- Currently Selected Scene: Scene ${currentScene?.sceneNumber} (${currentScene?.rawHeading})
- Scene Summaries: ${JSON.stringify(sceneSummaries)}

AVAILABLE ACTION DIRECTIVES:
1. "NAVIGATE_SCENE": Jump to a scene (payload: { "targetSceneNumber": "..." })
2. "NAVIGATE_PAGE": Jump to a page (payload: { "targetPageNumber": ... })
3. "UPDATE_SCENE_METADATA": Modify scene location, time, int/ext, or synopsis (payload: { "sceneNumber": "...", "location": "...", "timeOfDay": "...", "intExt": "..." })
4. "EDIT_SCENE_ELEMENTS" / "POLISH_DIALOGUE": Modify/enhance scene text (payload: { "sceneNumber": "...", "updatedScriptText": "..." })
5. "INSERT_NEW_SCENE": Add a new scene (payload: { "insertAfterSceneNumber": "...", "newScene": { ... } })
6. "SPLIT_SCENE": Split a scene into two (payload: { "sceneNumber": "...", "splitAtElementIndex": ... })
7. "MERGE_SCENES": Merge two scenes (payload: { "firstSceneNumber": "...", "secondSceneNumber": "..." })
8. "DELETE_SCENE": Delete a scene (payload: { "sceneNumber": "..." })
9. "RENUMBER_SCENES": Renumber all scenes sequentially (payload: {})
10. "ADD_BREAKDOWN_ITEM": Add items to breakdown (payload: { "sceneNumber": "...", "items": [{ "category": "PROPS"|"STUNTS"|"CAST"|..., "name": "..." }] })
11. "SET_VIEW_SETTINGS": Adjust zoom/font (payload: { "fontSize": ..., "zoom": ... })
12. "GENERAL_INSIGHT": Answering questions, character counts, summaries, creative suggestions, screenplay analysis (payload: { "answer": "..." })

USER REQUEST:
"${userPrompt}"

RESPONSE INSTRUCTION:
- If the user asks a question, set "actionType": "GENERAL_INSIGHT", "badgeTitle": "${isTamil ? 'திரைக்கதை விளக்கம்' : 'Script Insight'}", and provide a clear, comprehensive, nicely formatted answer in "summary" (and optional "explanation").
- If the user commands an action to edit, navigate, or format, choose the appropriate actionType and fill the payload.
- Respond in JSON format:
{
  "actionType": "GENERAL_INSIGHT" | "NAVIGATE_SCENE" | "UPDATE_SCENE_METADATA" | ...,
  "badgeTitle": "...",
  "summary": "${isTamil ? 'பதில் அல்லது செயல்படுத்திய விவரம் தமிழில்' : 'Direct, comprehensive response to user query or action description'}",
  "explanation": "Optional bullet points or extra detail",
  "payload": { ... }
}
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.3,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API HTTP ${res.status}`);
    }

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const candidateText = parts.find((p: any) => p.text)?.text || '';

    // Robust JSON extraction
    let parsed: any = null;
    const jsonBlockMatch = candidateText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const rawJson = jsonBlockMatch ? jsonBlockMatch[1] : candidateText;
    const objectMatch = rawJson.match(/\{[\s\S]*\}/);

    if (objectMatch) {
      try {
        parsed = JSON.parse(objectMatch[0]);
      } catch (e) {
        parsed = null;
      }
    }

    if (!parsed) {
      // If candidateText was direct natural language answer
      if (candidateText.trim().length > 0) {
        parsed = {
          actionType: 'GENERAL_INSIGHT',
          badgeTitle: isTamil ? 'AI விளக்கம்' : 'AI Analysis',
          summary: candidateText.trim(),
        };
      }
    }

    if (parsed) {
      return applyAgentPlan(parsed, currentSceneIndex, scenes, viewSettings, previousScenesSnapshot, language);
    }

    throw new Error('Could not parse response.');
  } catch (err: any) {
    console.warn('Gemini script agent fallback to local analytical engine:', err);
    return applyLocalHeuristic(userPrompt, currentSceneIndex, scenes, viewSettings, previousScenesSnapshot, language, intel);
  }
}

/**
 * Applies the structured Agent Plan to the live application state
 */
function applyAgentPlan(
  plan: any,
  currentSceneIndex: number,
  scenes: Scene[],
  viewSettings: ViewSettings,
  previousScenesSnapshot: Scene[],
  language: Language
): AgentExecutionResult {
  const isTamil = language === 'ta';
  const actionType: AgentActionType = plan.actionType || 'GENERAL_INSIGHT';
  const payload = plan.payload || {};

  switch (actionType) {
    case 'NAVIGATE_SCENE': {
      const targetScNum = payload.targetSceneNumber || payload.sceneNumber;
      const targetIdx = findSceneIndex(scenes, targetScNum);
      const finalIdx = targetIdx !== -1 ? targetIdx : Math.max(0, Math.min(Number(payload.sceneIndex || 0), scenes.length - 1));
      const targetScene = scenes[finalIdx];

      return {
        actionType,
        status: 'SUCCESS',
        badgeTitle: isTamil ? `காட்சி ${targetScene?.sceneNumber || finalIdx + 1}க்கு தாவியது` : `Jumped to Sc. ${targetScene?.sceneNumber || finalIdx + 1}`,
        summary: plan.summary || (isTamil ? `காட்சி ${targetScene?.sceneNumber || finalIdx + 1}க்கு பார்வை மாற்றப்பட்டது.` : `Navigated to Scene ${targetScene?.sceneNumber || finalIdx + 1} (${targetScene?.location || ''}).`),
        explanation: plan.explanation,
        targetSceneIndex: finalIdx,
        targetPageIndex: targetScene?.startPage ? targetScene.startPage - 1 : 0,
      };
    }

    case 'NAVIGATE_PAGE': {
      const targetPageNum = Number(payload.targetPageNumber || payload.pageNumber || 1);
      const targetPageIdx = Math.max(0, targetPageNum - 1);
      const sceneOnPage = scenes.findIndex((s) => s.startPage === targetPageNum);

      return {
        actionType,
        status: 'SUCCESS',
        badgeTitle: isTamil ? `பக்கம் ${targetPageNum}க்கு தாவியது` : `Jumped to Page ${targetPageNum}`,
        summary: plan.summary || (isTamil ? `பக்கம் ${targetPageNum}க்கு பார்வை மாற்றப்பட்டது.` : `Navigated to Page ${targetPageNum}.`),
        explanation: plan.explanation,
        targetPageIndex: targetPageIdx,
        targetSceneIndex: sceneOnPage !== -1 ? sceneOnPage : undefined,
      };
    }

    case 'UPDATE_SCENE_METADATA': {
      const scNum = payload.sceneNumber || scenes[currentSceneIndex]?.sceneNumber;
      const targetIdx = findSceneIndex(scenes, scNum);
      const validIdx = targetIdx !== -1 ? targetIdx : currentSceneIndex;
      const targetScene = scenes[validIdx];
      if (!targetScene) break;

      const newSceneNum = payload.sceneNumber || targetScene.sceneNumber;
      const newIntExt = payload.intExt || targetScene.intExt;
      const newLoc = payload.location || targetScene.location;
      const newLocTa = payload.locationTa || (payload.location ? translateToTamil(payload.location) : targetScene.locationTa);
      const newTime = payload.timeOfDay || targetScene.timeOfDay;
      const newSyn = payload.synopsis || targetScene.synopsis;
      const newSynTa = payload.synopsisTa || (payload.synopsis ? translateToTamil(payload.synopsis) : targetScene.synopsisTa);
      const newHeading = `காட்சி ${newSceneNum}: ${newIntExt} ${newLoc} - ${newTime}`;

      let hasSlugline = false;
      const updatedElements = targetScene.elements.map((el) => {
        if (el.type === 'SLUGLINE') {
          hasSlugline = true;
          return { ...el, text: newHeading };
        }
        return el;
      });

      if (!hasSlugline) {
        updatedElements.unshift({
          id: `el-${Date.now()}-slug`,
          type: 'SLUGLINE',
          text: newHeading,
        });
      }

      const updatedScene: Scene = {
        ...targetScene,
        sceneNumber: newSceneNum,
        intExt: newIntExt,
        location: newLoc,
        locationTa: newLocTa,
        timeOfDay: newTime,
        synopsis: newSyn,
        synopsisTa: newSynTa,
        rawHeading: newHeading,
        elements: updatedElements,
        rawScript: updatedElements.map((e) => e.text).join('\n'),
      };

      const newScenes = [...scenes];
      newScenes[validIdx] = updatedScene;

      return {
        actionType,
        status: 'SUCCESS',
        badgeTitle: isTamil ? `காட்சி ${updatedScene.sceneNumber} புதுப்பிக்கப்பட்டது` : `Updated Scene ${updatedScene.sceneNumber}`,
        summary: plan.summary || (isTamil ? `காட்சி ${updatedScene.sceneNumber}ன் விவரங்கள் வெற்றிகரமாக மாற்றப்பட்டன.` : `Updated metadata for Scene ${updatedScene.sceneNumber}: ${updatedScene.rawHeading}.`),
        explanation: plan.explanation,
        updatedScenes: newScenes,
        targetSceneIndex: validIdx,
        canUndo: true,
        previousScenes: previousScenesSnapshot,
      };
    }

    case 'ADD_BREAKDOWN_ITEM': {
      const scNum = payload.sceneNumber || scenes[currentSceneIndex]?.sceneNumber;
      const targetIdx = findSceneIndex(scenes, scNum);
      const validIdx = targetIdx !== -1 ? targetIdx : currentSceneIndex;
      const targetScene = scenes[validIdx];
      if (!targetScene) break;

      const rawItems = Array.isArray(payload.items) ? payload.items : [payload];
      const newItems: BreakdownItem[] = rawItems.map((item: any, idx: number) => ({
        id: `agent-item-${Date.now()}-${idx}`,
        category: normalizeBreakdownCategory(item.category),
        name: isTamil && item.nameTa ? item.nameTa : item.name || 'Prop',
        nameTa: item.nameTa || (item.name ? translateToTamil(item.name) : 'பொருள்'),
        description: item.description || '',
        descriptionTa: item.descriptionTa || (item.description ? translateDescriptionToTamil(item.description) : ''),
        count: Number(item.count || 1),
        isCustom: true,
      }));

      const updatedScene: Scene = {
        ...targetScene,
        breakdownItems: [...targetScene.breakdownItems, ...newItems],
      };

      const newScenes = [...scenes];
      newScenes[validIdx] = updatedScene;

      return {
        actionType,
        status: 'SUCCESS',
        badgeTitle: isTamil ? `${newItems.length} குறிப்புகள் சேர்க்கப்பட்டன` : `Added ${newItems.length} Breakdown Items`,
        summary: plan.summary || (isTamil ? `காட்சி ${targetScene.sceneNumber}க்கு ${newItems.length} தயாரிப்பு குறிப்புகள் சேர்க்கப்பட்டன.` : `Added ${newItems.length} production items to Scene ${targetScene.sceneNumber} (${newItems.map((i) => i.name).join(', ')}).`),
        explanation: plan.explanation,
        updatedScenes: newScenes,
        targetSceneIndex: validIdx,
        canUndo: true,
        previousScenes: previousScenesSnapshot,
      };
    }

    case 'REMOVE_BREAKDOWN_ITEM': {
      const scNum = payload.sceneNumber || scenes[currentSceneIndex]?.sceneNumber;
      const targetIdx = findSceneIndex(scenes, scNum);
      const validIdx = targetIdx !== -1 ? targetIdx : currentSceneIndex;
      const targetScene = scenes[validIdx];
      if (!targetScene) break;

      const query = String(payload.itemName || payload.id || '').toLowerCase();
      const filtered = targetScene.breakdownItems.filter(
        (i) => i.id !== payload.id && !i.name.toLowerCase().includes(query) && (!i.nameTa || !i.nameTa.toLowerCase().includes(query))
      );

      const updatedScene: Scene = {
        ...targetScene,
        breakdownItems: filtered,
      };

      const newScenes = [...scenes];
      newScenes[validIdx] = updatedScene;

      return {
        actionType,
        status: 'SUCCESS',
        badgeTitle: isTamil ? `குறிப்பு நீக்கப்பட்டது` : `Removed Item`,
        summary: plan.summary || (isTamil ? `காட்சி ${targetScene.sceneNumber}லிருந்து குறிப்பு நீக்கப்பட்டது.` : `Removed matching items from Scene ${targetScene.sceneNumber}.`),
        explanation: plan.explanation,
        updatedScenes: newScenes,
        targetSceneIndex: validIdx,
        canUndo: true,
        previousScenes: previousScenesSnapshot,
      };
    }

    case 'EDIT_SCENE_ELEMENTS':
    case 'POLISH_DIALOGUE': {
      const scNum = payload.sceneNumber || scenes[currentSceneIndex]?.sceneNumber;
      const targetIdx = findSceneIndex(scenes, scNum);
      const validIdx = targetIdx !== -1 ? targetIdx : currentSceneIndex;
      const targetScene = scenes[validIdx];
      if (!targetScene) break;

      let newElements: ScriptElement[] = targetScene.elements;

      if (payload.updatedScriptText) {
        const parsed = parseScreenplay(payload.updatedScriptText);
        if (parsed.length > 0 && parsed[0].elements) {
          newElements = parsed[0].elements;
        }
      } else if (Array.isArray(payload.elements)) {
        const formattedEls: ScriptElement[] = payload.elements.map((el: any, elIdx: number) => ({
          id: `el-${Date.now()}-${elIdx}`,
          type: el.type || 'ACTION',
          text: el.text || '',
        }));

        if (payload.mode === 'APPEND') {
          newElements = [...targetScene.elements, ...formattedEls];
        } else {
          newElements = formattedEls;
        }
      }

      const eighths = Math.max(1, Math.ceil((newElements.length / 26) * 8));
      const updatedScene: Scene = {
        ...targetScene,
        elements: newElements,
        rawScript: newElements.map((e) => e.text).join('\n'),
        pagesEighths: eighths,
        formattedPages: formatEighths(eighths),
      };

      const newScenes = [...scenes];
      newScenes[validIdx] = updatedScene;

      return {
        actionType,
        status: 'SUCCESS',
        badgeTitle: isTamil ? `வசனம் / காட்சி மாற்றப்பட்டது` : `Edited Scene Text`,
        summary: plan.summary || (isTamil ? `காட்சி ${targetScene.sceneNumber}ன் உரை வெற்றிகரமாக திருத்தப்பட்டது.` : `Script content for Scene ${targetScene.sceneNumber} has been updated.`),
        explanation: plan.explanation,
        updatedScenes: newScenes,
        targetSceneIndex: validIdx,
        canUndo: true,
        previousScenes: previousScenesSnapshot,
      };
    }

    case 'INSERT_NEW_SCENE': {
      const afterScNum = payload.insertAfterSceneNumber;
      const targetIdx = findSceneIndex(scenes, afterScNum);
      const insertAt = targetIdx !== -1 ? targetIdx + 1 : scenes.length;

      const rawScene = payload.newScene || {};
      const newSceneNum = rawScene.sceneNumber || String(insertAt + 1);
      const newSceneId = `scene-${Date.now()}`;
      const heading = rawScene.rawHeading || `காட்சி ${newSceneNum}: ${rawScene.intExt || 'உள்'} ${rawScene.location || 'இடம்'} - ${rawScene.timeOfDay || 'பகல்'}`;

      const elements: ScriptElement[] = Array.isArray(rawScene.elements) && rawScene.elements.length > 0
        ? rawScene.elements.map((e: any, idx: number) => ({ id: `el-${Date.now()}-${idx}`, type: e.type || 'ACTION', text: e.text || '' }))
        : [
            { id: `el-${Date.now()}-0`, type: 'SLUGLINE', text: heading },
            { id: `el-${Date.now()}-1`, type: 'ACTION', text: rawScene.synopsis || 'காட்சி சூழல் விவரம்.' },
          ];

      const newSceneObj: Scene = {
        id: newSceneId,
        sceneNumber: newSceneNum,
        intExt: rawScene.intExt || 'உள்',
        location: rawScene.location || 'புதிய இடம்',
        locationTa: rawScene.locationTa || (rawScene.location ? translateToTamil(rawScene.location) : 'புதிய இடம்'),
        timeOfDay: rawScene.timeOfDay || 'பகல்',
        rawHeading: heading,
        pagesEighths: 2,
        formattedPages: '2/8',
        synopsis: rawScene.synopsis || '',
        synopsisTa: rawScene.synopsisTa || '',
        rawScript: elements.map((e) => e.text).join('\n'),
        elements,
        breakdownItems: [],
        shootingDay: Math.ceil((insertAt + 1) / 4),
      };

      const newScenes = [...scenes];
      newScenes.splice(insertAt, 0, newSceneObj);

      return {
        actionType,
        status: 'SUCCESS',
        badgeTitle: isTamil ? `புதிய காட்சி ${newSceneNum} சேர்க்கப்பட்டது` : `Inserted Scene ${newSceneNum}`,
        summary: plan.summary || (isTamil ? `புதிய காட்சி ${newSceneNum} (${newSceneObj.location}) வெற்றிகரமாக சேர்க்கப்பட்டது.` : `Inserted new Scene ${newSceneNum} (${newSceneObj.location} - ${newSceneObj.timeOfDay}).`),
        explanation: plan.explanation,
        updatedScenes: newScenes,
        targetSceneIndex: insertAt,
        canUndo: true,
        previousScenes: previousScenesSnapshot,
      };
    }

    case 'SPLIT_SCENE': {
      const scNum = payload.sceneNumber || scenes[currentSceneIndex]?.sceneNumber;
      const targetIdx = findSceneIndex(scenes, scNum);
      const validIdx = targetIdx !== -1 ? targetIdx : currentSceneIndex;
      const sourceScene = scenes[validIdx];
      if (!sourceScene) break;

      const splitElIdx = Number(payload.splitAtElementIndex || Math.floor(sourceScene.elements.length / 2));
      const elementsBefore = sourceScene.elements.slice(0, splitElIdx);
      const elementsAfter = sourceScene.elements.slice(splitElIdx);

      if (elementsAfter.length === 0) break;

      const newSceneNum = `${sourceScene.sceneNumber}B`;
      const newSceneHeading = `காட்சி ${newSceneNum}: ${sourceScene.intExt} ${sourceScene.location} - ${sourceScene.timeOfDay}`;
      const finalElementsAfter =
        elementsAfter[0]?.type === 'SLUGLINE'
          ? elementsAfter
          : [{ id: `el-${Date.now()}-slug`, type: 'SLUGLINE' as const, text: newSceneHeading }, ...elementsAfter];

      const newScene: Scene = {
        id: `scene-${Date.now()}`,
        sceneNumber: newSceneNum,
        intExt: sourceScene.intExt,
        location: sourceScene.location,
        locationTa: sourceScene.locationTa,
        timeOfDay: sourceScene.timeOfDay,
        rawHeading: newSceneHeading,
        pagesEighths: Math.max(1, Math.ceil((finalElementsAfter.length / 26) * 8)),
        formattedPages: formatEighths(Math.max(1, Math.ceil((finalElementsAfter.length / 26) * 8))),
        synopsis: sourceScene.synopsis,
        rawScript: finalElementsAfter.map((e) => e.text).join('\n'),
        elements: finalElementsAfter,
        breakdownItems: [],
        shootingDay: sourceScene.shootingDay,
      };

      const updatedSource: Scene = {
        ...sourceScene,
        elements: elementsBefore,
        pagesEighths: Math.max(1, Math.ceil((elementsBefore.length / 26) * 8)),
        formattedPages: formatEighths(Math.max(1, Math.ceil((elementsBefore.length / 26) * 8))),
        rawScript: elementsBefore.map((e) => e.text).join('\n'),
      };

      const newScenes = [...scenes];
      newScenes.splice(validIdx, 1, updatedSource, newScene);

      return {
        actionType,
        status: 'SUCCESS',
        badgeTitle: isTamil ? `காட்சி ${sourceScene.sceneNumber} பிரிக்கப்பட்டது` : `Split Scene ${sourceScene.sceneNumber}`,
        summary: plan.summary || (isTamil ? `காட்சி ${sourceScene.sceneNumber} இரண்டு தனி காட்சிகளாக பிரிக்கப்பட்டது (${sourceScene.sceneNumber} & ${newSceneNum}).` : `Split Scene ${sourceScene.sceneNumber} into Scene ${sourceScene.sceneNumber} and ${newSceneNum}.`),
        explanation: plan.explanation,
        updatedScenes: newScenes,
        targetSceneIndex: validIdx,
        canUndo: true,
        previousScenes: previousScenesSnapshot,
      };
    }

    case 'MERGE_SCENES': {
      const scNum1 = payload.firstSceneNumber || scenes[currentSceneIndex]?.sceneNumber;
      const targetIdx = findSceneIndex(scenes, scNum1);
      const validIdx = targetIdx !== -1 ? targetIdx : currentSceneIndex;
      if (validIdx >= scenes.length - 1) break;

      const current = scenes[validIdx];
      const next = scenes[validIdx + 1];

      const mergedElements = [...current.elements, ...next.elements];
      const eighths = Math.max(1, Math.ceil((mergedElements.length / 26) * 8));
      const mergedScene: Scene = {
        ...current,
        elements: mergedElements,
        rawScript: `${current.rawScript}\n${next.rawScript}`,
        pagesEighths: eighths,
        formattedPages: formatEighths(eighths),
        breakdownItems: [...current.breakdownItems, ...next.breakdownItems],
      };

      const newScenes = [...scenes];
      newScenes.splice(validIdx, 2, mergedScene);

      return {
        actionType,
        status: 'SUCCESS',
        badgeTitle: isTamil ? `காட்சிகள் இணைக்கப்பட்டன` : `Merged Scenes`,
        summary: plan.summary || (isTamil ? `காட்சி ${current.sceneNumber} மற்றும் ${next.sceneNumber} இணைக்கப்பட்டன.` : `Merged Scene ${current.sceneNumber} and Scene ${next.sceneNumber}.`),
        explanation: plan.explanation,
        updatedScenes: newScenes,
        targetSceneIndex: validIdx,
        canUndo: true,
        previousScenes: previousScenesSnapshot,
      };
    }

    case 'DELETE_SCENE': {
      const scNum = payload.sceneNumber || scenes[currentSceneIndex]?.sceneNumber;
      const targetIdx = findSceneIndex(scenes, scNum);
      const validIdx = targetIdx !== -1 ? targetIdx : currentSceneIndex;
      if (scenes.length <= 1) break;

      const deletedScene = scenes[validIdx];
      const filtered = scenes.filter((_, idx) => idx !== validIdx);

      return {
        actionType,
        status: 'SUCCESS',
        badgeTitle: isTamil ? `காட்சி ${deletedScene.sceneNumber} நீக்கப்பட்டது` : `Deleted Scene ${deletedScene.sceneNumber}`,
        summary: plan.summary || (isTamil ? `காட்சி ${deletedScene.sceneNumber} வெற்றிகரமாக நீக்கப்பட்டது.` : `Deleted Scene ${deletedScene.sceneNumber}.`),
        explanation: plan.explanation,
        updatedScenes: filtered,
        targetSceneIndex: Math.max(0, validIdx - 1),
        canUndo: true,
        previousScenes: previousScenesSnapshot,
      };
    }

    case 'RENUMBER_SCENES': {
      const renumbered = scenes.map((s, idx) => {
        const newNum = String(idx + 1);
        let newHeading = s.rawHeading;
        if (/^(?:காட்சி|SCENE)\s*[:\.]?\s*\w+/i.test(newHeading)) {
          newHeading = newHeading.replace(/^(?:காட்சி|SCENE)\s*[:\.]?\s*\w+/i, `காட்சி: ${newNum}`);
        } else {
          newHeading = `காட்சி: ${newNum} ${s.intExt} ${s.location} - ${s.timeOfDay}`;
        }

        let hasSlugline = false;
        const updatedElements = s.elements.map((el) => {
          if (el.type === 'SLUGLINE') {
            hasSlugline = true;
            if (/^(?:காட்சி|SCENE)\s*[:\.]?\s*\w+/i.test(el.text)) {
              return { ...el, text: el.text.replace(/^(?:காட்சி|SCENE)\s*[:\.]?\s*\w+/i, `காட்சி: ${newNum}`) };
            }
            return { ...el, text: newHeading };
          }
          return el;
        });

        if (!hasSlugline) {
          updatedElements.unshift({ id: `el-${Date.now()}-${idx}-slug`, type: 'SLUGLINE', text: newHeading });
        }

        return {
          ...s,
          sceneNumber: newNum,
          rawHeading: newHeading,
          elements: updatedElements,
          rawScript: updatedElements.map((e) => e.text).join('\n'),
        };
      });

      return {
        actionType,
        status: 'SUCCESS',
        badgeTitle: isTamil ? `காட்சிகள் வரிசைப்படுத்தப்பட்டன` : `Renumbered 1..N`,
        summary: plan.summary || (isTamil ? `அனைத்து காட்சிகளும் 1 முதல் ${scenes.length} வரை வரிசையாக மாற்றப்பட்டன.` : `All ${scenes.length} scenes have been sequentially renumbered 1 to ${scenes.length}.`),
        explanation: plan.explanation,
        updatedScenes: renumbered,
        canUndo: true,
        previousScenes: previousScenesSnapshot,
      };
    }

    case 'SET_VIEW_SETTINGS': {
      const newSettings: ViewSettings = {
        fontSize: payload.fontSize !== undefined ? Number(payload.fontSize) : viewSettings.fontSize,
        zoom: payload.zoom !== undefined ? Number(payload.zoom) : viewSettings.zoom,
        lineSpacing: payload.lineSpacing || viewSettings.lineSpacing,
        pageSize: payload.pageSize || viewSettings.pageSize,
        margins: payload.margins || viewSettings.margins,
        viewMode: payload.viewMode || viewSettings.viewMode,
      };

      return {
        actionType,
        status: 'SUCCESS',
        badgeTitle: isTamil ? `பார்வை அமைப்புகள் மாற்றப்பட்டன` : `Adjusted View Settings`,
        summary: plan.summary || (isTamil ? `எழுத்து அளவு, ஜூம் அல்லது பக்க அமைப்புகள் வெற்றிகரமாக மாற்றப்பட்டன.` : `Updated screenplay viewer formatting settings.`),
        explanation: plan.explanation,
        updatedViewSettings: newSettings,
      };
    }

    case 'TRANSLATE_SCENE': {
      const scNum = payload.sceneNumber || scenes[currentSceneIndex]?.sceneNumber;
      const targetIdx = findSceneIndex(scenes, scNum);
      const validIdx = targetIdx !== -1 ? targetIdx : currentSceneIndex;
      const targetScene = scenes[validIdx];
      if (!targetScene) break;

      const locTa = targetScene.locationTa || translateToTamil(targetScene.location);
      const synTa = targetScene.synopsisTa || translateToTamil(targetScene.synopsis);

      const updatedScene: Scene = {
        ...targetScene,
        location: locTa,
        locationTa: locTa,
        synopsis: synTa,
        synopsisTa: synTa,
        rawHeading: `காட்சி ${targetScene.sceneNumber}: ${targetScene.intExt} ${locTa} - ${targetScene.timeOfDay}`,
      };

      const newScenes = [...scenes];
      newScenes[validIdx] = updatedScene;

      return {
        actionType,
        status: 'SUCCESS',
        badgeTitle: isTamil ? `தமிழுக்கு மாற்றப்பட்டது` : `Translated to Tamil`,
        summary: plan.summary || (isTamil ? `காட்சி ${targetScene.sceneNumber}ன் விவரங்கள் தமிழில் மொழிபெயர்க்கப்பட்டன.` : `Translated Scene ${targetScene.sceneNumber} details to Tamil.`),
        explanation: plan.explanation,
        updatedScenes: newScenes,
        targetSceneIndex: validIdx,
        canUndo: true,
        previousScenes: previousScenesSnapshot,
      };
    }

    case 'GENERAL_INSIGHT':
    default:
      return {
        actionType: 'GENERAL_INSIGHT',
        status: 'INFO',
        badgeTitle: isTamil ? `AI விளக்கம் & ஆலோசனை` : `AI Insight`,
        summary: plan.summary || plan.payload?.answer || (isTamil ? 'உங்கள் கேள்விக்கான AI தயாரிப்பு விளக்கம்.' : 'Here is the requested screenplay analysis.'),
        explanation: plan.explanation || plan.payload?.answer,
      };
  }

  return {
    actionType: 'GENERAL_INSIGHT',
    status: 'INFO',
    badgeTitle: isTamil ? `AI பதில்` : `Assistant Response`,
    summary: plan.summary || (isTamil ? 'செயல்பாடு நிறைவடைந்தது.' : 'Action completed.'),
    explanation: plan.explanation,
  };
}

/**
 * Fast client-side Heuristic & Analytical Engine for instant Q&A and offline execution
 */
function applyLocalHeuristic(
  userPrompt: string,
  currentSceneIndex: number,
  scenes: Scene[],
  viewSettings: ViewSettings,
  previousScenesSnapshot: Scene[],
  language: Language,
  intel?: ReturnType<typeof extractScreenplayIntelligence>
): AgentExecutionResult {
  const isTamil = language === 'ta';
  const text = userPrompt.toLowerCase().trim();
  const screenIntel = intel || extractScreenplayIntelligence(scenes);

  // 1. Navigation to scene
  const sceneNavMatch =
    text.match(/(?:go to|jump to|open|show|move to|காட்சி)\s*(?:scene|sc\.?|காட்சி)?\s*(\d+[a-z]?)/i) ||
    text.match(/(?:scene|காட்சி)\s*(\d+[a-z]?)/i);
  if (sceneNavMatch && !text.includes('about') && !text.includes('what') && !text.includes('who') && !text.includes('how')) {
    const scNum = sceneNavMatch[1];
    const targetIdx = findSceneIndex(scenes, scNum);
    if (targetIdx !== -1) {
      const targetScene = scenes[targetIdx];
      return {
        actionType: 'NAVIGATE_SCENE',
        status: 'SUCCESS',
        badgeTitle: isTamil ? `காட்சி ${scNum}க்கு தாவியது` : `Jumped to Sc. ${scNum}`,
        summary: isTamil ? `காட்சி ${scNum}க்கு பார்வை மாற்றப்பட்டது.` : `Navigated to Scene ${scNum} (${targetScene.location}).`,
        targetSceneIndex: targetIdx,
        targetPageIndex: targetScene.startPage ? targetScene.startPage - 1 : 0,
      };
    }
  }

  // 2. Navigation to page
  const pageNavMatch = text.match(/(?:page|பக்கம்)\s*(\d+)/i);
  if (pageNavMatch && !text.includes('how many') && !text.includes('count')) {
    const pgNum = parseInt(pageNavMatch[1], 10);
    const sceneOnPage = scenes.findIndex((s) => s.startPage === pgNum);
    return {
      actionType: 'NAVIGATE_PAGE',
      status: 'SUCCESS',
      badgeTitle: isTamil ? `பக்கம் ${pgNum}க்கு தாவியது` : `Jumped to Page ${pgNum}`,
      summary: isTamil ? `பக்கம் ${pgNum}க்கு பார்வை மாற்றப்பட்டது.` : `Navigated to Page ${pgNum}.`,
      targetPageIndex: Math.max(0, pgNum - 1),
      targetSceneIndex: sceneOnPage !== -1 ? sceneOnPage : undefined,
    };
  }

  // 3. Questions about Characters / Cast (e.g. "how many characters", "who are the characters", "character list")
  if (
    text.includes('character') ||
    text.includes('actor') ||
    text.includes('cast') ||
    text.includes('கதாபாத்திரம்') ||
    text.includes('நடிகர்')
  ) {
    const topChars = screenIntel.characters.slice(0, 12);
    const charListFormatted = topChars
      .map((c, i) => `${i + 1}. **${c.name}** — in ${c.sceneCount} scene${c.sceneCount > 1 ? 's' : ''} (Sc. ${c.scenes.slice(0, 8).join(', ')}${c.scenes.length > 8 ? '...' : ''})`)
      .join('\n');

    const summary = isTamil
      ? `இந்த திரைக்கதையில் மொத்தம் **${screenIntel.totalCharacters} கதாபாத்திரங்கள்** அடையாளம் காணப்பட்டுள்ளன:\n\n${charListFormatted}`
      : `This screenplay has a total of **${screenIntel.totalCharacters} speaking characters** identified across ${scenes.length} scenes:\n\n${charListFormatted}`;

    return {
      actionType: 'GENERAL_INSIGHT',
      status: 'INFO',
      badgeTitle: isTamil ? `கதாபாத்திரங்கள் (${screenIntel.totalCharacters})` : `Characters (${screenIntel.totalCharacters})`,
      summary,
      explanation: isTamil
        ? `குறிப்பு: மேலே உள்ள கதாபாத்திரங்கள் திரைக்கதையின் வசனங்கள் மற்றும் தயாரிப்பு குறிப்புகளிலிருந்து கணக்கிடப்பட்டுள்ளன.`
        : `Note: Characters are extracted from scene dialogues and breakdown cast lists across all pages.`,
    };
  }

  // 4. Questions about Locations (e.g. "locations", "how many locations", "where is it shot")
  if (
    text.includes('location') ||
    text.includes('place') ||
    text.includes('இடம்') ||
    text.includes('இடங்கள்')
  ) {
    const locList = screenIntel.locations
      .slice(0, 10)
      .map((l, i) => `${i + 1}. **${l.location}** (${l.count} scene${l.count > 1 ? 's' : ''}: Sc. ${l.scenes.slice(0, 6).join(', ')})`)
      .join('\n');

    const summary = isTamil
      ? `இந்த திரைக்கதையில் மொத்தம் **${screenIntel.locations.length} முக்கிய படப்பிடிப்பு இடங்கள்** உள்ளன:\n\n${locList}`
      : `This screenplay spans across **${screenIntel.locations.length} distinct locations**:\n\n${locList}`;

    return {
      actionType: 'GENERAL_INSIGHT',
      status: 'INFO',
      badgeTitle: isTamil ? `படப்பிடிப்பு இடங்கள் (${screenIntel.locations.length})` : `Locations (${screenIntel.locations.length})`,
      summary,
    };
  }

  // 5. Questions about specific scene (e.g. "what is scene 3 about", "tell me about scene 1", "synopsis of scene 2")
  const specificSceneQuery = text.match(/(?:scene|sc\.?|காட்சி)\s*(\d+[a-z]?)/i);
  if (specificSceneQuery && (text.includes('about') || text.includes('what') || text.includes('tell') || text.includes('synopsis') || text.includes('விவரம்') || text.includes('சுருக்கம்'))) {
    const targetIdx = findSceneIndex(scenes, specificSceneQuery[1]);
    if (targetIdx !== -1) {
      const sc = scenes[targetIdx];
      const charsInSc = Array.from(new Set(
        (sc.elements || []).filter((e) => e.type === 'CHARACTER').map((e) => e.text)
      )).join(', ') || 'No speaking characters';

      const summary = isTamil
        ? `🎬 **காட்சி ${sc.sceneNumber}:** ${sc.rawHeading}\n\n• **இடம்:** ${sc.location}\n• **நேரம்:** ${sc.timeOfDay} (${sc.intExt})\n• **பக்க அளவு:** ${sc.formattedPages} பக்கங்கள்\n• **கதாபாத்திரங்கள்:** ${charsInSc}\n• **காட்சி சுருக்கம்:** ${sc.synopsis || 'சுருக்கம் இல்லை.'}`
        : `🎬 **Scene ${sc.sceneNumber}:** ${sc.rawHeading}\n\n• **Location:** ${sc.location}\n• **Time:** ${sc.timeOfDay} (${sc.intExt})\n• **Length:** ${sc.formattedPages} pages (${sc.pagesEighths}/8)\n• **Characters:** ${charsInSc}\n• **Synopsis:** ${sc.synopsis || 'No synopsis available.'}`;

      return {
        actionType: 'GENERAL_INSIGHT',
        status: 'INFO',
        badgeTitle: isTamil ? `காட்சி ${sc.sceneNumber} விவரம்` : `Scene ${sc.sceneNumber} Info`,
        summary,
        targetSceneIndex: targetIdx,
        targetPageIndex: sc.startPage ? sc.startPage - 1 : 0,
      };
    }
  }

  // 6. Questions about Stunts / Action
  if (text.includes('stunt') || text.includes('fight') || text.includes('action') || text.includes('சண்டை')) {
    const summary = isTamil
      ? `இந்த திரைக்கதையில் உள்ள சண்டைக்காட்சிகள்:\n\n${
          screenIntel.stuntsList.length > 0
            ? screenIntel.stuntsList.map((st, i) => `${i + 1}. **காட்சி ${st.sceneNumber}:** ${st.description}`).join('\n')
            : 'குறிப்பிட்ட சண்டைக்காட்சிகள் குறிக்கப்படவில்லை.'
        }`
      : `Stunt and action sequences identified in this script:\n\n${
          screenIntel.stuntsList.length > 0
            ? screenIntel.stuntsList.map((st, i) => `${i + 1}. **Scene ${st.sceneNumber}:** ${st.description}`).join('\n')
            : 'No specific stunt breakdown items currently tagged. You can ask me to add stunt items to any scene!'
        }`;

    return {
      actionType: 'GENERAL_INSIGHT',
      status: 'INFO',
      badgeTitle: isTamil ? `சண்டைக்காட்சிகள்` : `Stunt Breakdown`,
      summary,
    };
  }

  // 7. General Screenplay Overview / Summary / Stats
  if (
    text.includes('summary') ||
    text.includes('overview') ||
    text.includes('stats') ||
    text.includes('how many scenes') ||
    text.includes('day night') ||
    text.includes('சுருக்கம்') ||
    text.includes('எத்தனை காட்சி')
  ) {
    const totalEighths = scenes.reduce((acc, s) => acc + s.pagesEighths, 0);
    const summary = isTamil
      ? `📊 **திரைக்கதை தயாரிப்பு சுருக்கம்:**\n\n• **மொத்த காட்சிகள்:** ${scenes.length} காட்சிகள்\n• **பக்க அளவு:** ${formatEighths(totalEighths)} பக்கங்கள்\n• **பகல் / இரவு விகிதம்:** ${screenIntel.dayScenes} பகல் / ${screenIntel.nightScenes} இரவு\n• **உள் / வெளி விகிதம்:** ${screenIntel.intScenes} உள் / ${screenIntel.extScenes} வெளி\n• **கதாபாத்திரங்கள்:** ${screenIntel.totalCharacters} நடிகர்கள்\n• **இடங்கள்:** ${screenIntel.locations.length} இடங்கள்`
      : `📊 **Screenplay Production Summary:**\n\n• **Total Scenes:** ${scenes.length} scenes\n• **Total Length:** ${formatEighths(totalEighths)} pages\n• **Day / Night Ratio:** ${screenIntel.dayScenes} Day / ${screenIntel.nightScenes} Night scenes\n• **Int / Ext Ratio:** ${screenIntel.intScenes} Interior / ${screenIntel.extScenes} Exterior scenes\n• **Speaking Characters:** ${screenIntel.totalCharacters} characters\n• **Unique Locations:** ${screenIntel.locations.length} locations`;

    return {
      actionType: 'GENERAL_INSIGHT',
      status: 'INFO',
      badgeTitle: isTamil ? `திரைக்கதை சுருக்கம்` : `Script Overview`,
      summary,
    };
  }

  // 8. Zoom / Font Size adjustments
  const zoomMatch = text.match(/zoom\s*(?:to\s*)?(\d+)/i);
  const fontMatch = text.match(/(?:font|size|text size)\s*(?:to\s*)?(\d+)/i);
  if (zoomMatch || fontMatch) {
    const newZoom = zoomMatch ? Math.min(175, Math.max(50, parseInt(zoomMatch[1], 10))) : viewSettings.zoom;
    const newFont = fontMatch ? Math.min(22, Math.max(10, parseInt(fontMatch[1], 10))) : viewSettings.fontSize;
    return {
      actionType: 'SET_VIEW_SETTINGS',
      status: 'SUCCESS',
      badgeTitle: isTamil ? `பார்வை அளவு மாற்றப்பட்டது` : `View Settings Updated`,
      summary: isTamil ? `எழுத்து அளவு ${newFont}pt, ஜூம் ${newZoom}% ஆக மாற்றப்பட்டது.` : `Adjusted font size to ${newFont}pt and zoom to ${newZoom}%.`,
      updatedViewSettings: { ...viewSettings, zoom: newZoom, fontSize: newFont },
    };
  }

  // 9. Renumber scenes
  if (text.includes('renumber') || text.includes('வரிசைப்படுத்து') || text.includes('1..n')) {
    const renumbered = scenes.map((s, idx) => {
      const newNum = String(idx + 1);
      let newHeading = s.rawHeading;
      if (/^(?:காட்சி|SCENE)\s*[:\.]?\s*\w+/i.test(newHeading)) {
        newHeading = newHeading.replace(/^(?:காட்சி|SCENE)\s*[:\.]?\s*\w+/i, `காட்சி: ${newNum}`);
      } else {
        newHeading = `காட்சி: ${newNum} ${s.intExt} ${s.location} - ${s.timeOfDay}`;
      }

      let hasSlugline = false;
      const updatedElements = s.elements.map((el) => {
        if (el.type === 'SLUGLINE') {
          hasSlugline = true;
          if (/^(?:காட்சி|SCENE)\s*[:\.]?\s*\w+/i.test(el.text)) {
            return { ...el, text: el.text.replace(/^(?:காட்சி|SCENE)\s*[:\.]?\s*\w+/i, `காட்சி: ${newNum}`) };
          }
          return { ...el, text: newHeading };
        }
        return el;
      });

      if (!hasSlugline) {
        updatedElements.unshift({ id: `el-${Date.now()}-${idx}-slug`, type: 'SLUGLINE', text: newHeading });
      }

      return {
        ...s,
        sceneNumber: newNum,
        rawHeading: newHeading,
        elements: updatedElements,
        rawScript: updatedElements.map((e) => e.text).join('\n'),
      };
    });

    return {
      actionType: 'RENUMBER_SCENES',
      status: 'SUCCESS',
      badgeTitle: isTamil ? `காட்சிகள் வரிசைப்படுத்தப்பட்டன` : `Renumbered Scenes`,
      summary: isTamil ? `அனைத்து காட்சிகளும் 1 முதல் ${scenes.length} வரை வரிசையாக மாற்றப்பட்டன.` : `All ${scenes.length} scenes have been sequentially renumbered.`,
      updatedScenes: renumbered,
      canUndo: true,
      previousScenes: previousScenesSnapshot,
    };
  }

  // 10. Change Time of Day
  if (text.includes('night') || text.includes('இரவு') || text.includes('day') || text.includes('பகல்')) {
    const isNight = text.includes('night') || text.includes('இரவு');
    const scIdx = currentSceneIndex;
    const target = scenes[scIdx];
    if (target) {
      const newTime = isNight ? 'இரவு' : 'பகல்';
      const newHeading = `காட்சி ${target.sceneNumber}: ${target.intExt} ${target.location} - ${newTime}`;
      const updatedElements = target.elements.map((el) => {
        if (el.type === 'SLUGLINE') {
          return { ...el, text: newHeading };
        }
        return el;
      });

      const updated: Scene = {
        ...target,
        timeOfDay: newTime,
        rawHeading: newHeading,
        elements: updatedElements,
        rawScript: updatedElements.map((e) => e.text).join('\n'),
      };
      const newScenes = [...scenes];
      newScenes[scIdx] = updated;

      return {
        actionType: 'UPDATE_SCENE_METADATA',
        status: 'SUCCESS',
        badgeTitle: isTamil ? `நேரம் மாற்றப்பட்டது` : `Time of Day Updated`,
        summary: isTamil ? `காட்சி ${target.sceneNumber}ன் நேரம் '${newTime}' என மாற்றப்பட்டது.` : `Changed Scene ${target.sceneNumber} time of day to ${newTime}.`,
        updatedScenes: newScenes,
        targetSceneIndex: scIdx,
        canUndo: true,
        previousScenes: previousScenesSnapshot,
      };
    }
  }

  // Default helpful intelligence response
  return {
    actionType: 'GENERAL_INSIGHT',
    status: 'INFO',
    badgeTitle: isTamil ? `திரைக்கதை AI பதில்` : `Script Q&A`,
    summary: isTamil
      ? `திரைக்கதை பற்றிய உங்கள் கேள்வி: "${userPrompt}".\n\nநீங்கள் கதாபாத்திரங்கள், சண்டைக்காட்சிகள், படப்பிடிப்பு இடங்கள், காட்சி சுருக்கம் அல்லது நேரலை மாற்றங்கள் (Scene edits, jumps, formatting) பற்றி எதை வேண்டுமானாலும் கேட்கலாம்.`
      : `Here is the screenplay overview for your query: "${userPrompt}".\n\nYou can ask about character counts, plot points, stunt/prop breakdowns, scene summaries, or give direct editing directives.`,
  };
}
