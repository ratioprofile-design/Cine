import { Scene, ScriptElement, ScriptPage, ScriptPageItem } from '../types/production';

// Common regex patterns for English and Tamil screenplay sluglines
const ENGLISH_SLUG_REGEX = /^(?:(\d+)\s+)?(?:(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.))\s+([^-\n]+?)(?:\s*-\s*(DAY|NIGHT|DUSK|DAWN|EVENING|MORNING|CONTINUOUS|LATER|SAME TIME))?(?:\s+(\d+))?$/i;

// Standard Tamil inline sluglines: e.g. "காட்சி 1: உள். கோவில் - பகல்" or "உள். வீடு - இரவு"
const TAMIL_INLINE_SLUG_REGEX = /^(?:காட்சி\s*(\d+)[:\.]?\s*)?(?:(உள்\.|வெளி\.|உள்\/வெளி\.))\s*([^-\n]+?)(?:\s*-\s*(பகல்|இரவு|மாலை|விடியல்|தொடர்ச்சி))?$/i;

// Pure Tamil Scene Break marker: matches "காட்சி: 1", "காட்சி: 2", "காட்சி 3", "காட்சி: 6 இடம்: ..."
const TAMIL_SCENE_BREAK_REGEX = /^காட்சி\s*[:\.]?\s*(\d+)(.*)$/i;

// Format eighths number (e.g. 11 -> "1 3/8", 3 -> "3/8", 8 -> "1")
export function formatEighths(eighths: number): string {
  if (eighths <= 0) return '1/8';
  const fullPages = Math.floor(eighths / 8);
  const remainingEighths = eighths % 8;

  if (fullPages === 0) {
    return `${remainingEighths || 1}/8`;
  }
  if (remainingEighths === 0) {
    return `${fullPages}`;
  }
  return `${fullPages} ${remainingEighths}/8`;
}

export function parseScreenplay(rawScript: string): Scene[] {
  if (!rawScript || !rawScript.trim()) return [];

  const lines = rawScript.split(/\r?\n/);
  const scenes: Scene[] = [];

  let currentScene: Scene | null = null;
  let currentSceneLines: string[] = [];
  let sceneIndex = 1;

  const commitScene = () => {
    if (!currentScene) return;

    // Estimate page length in eighths (standard ~26 lines = 8 eighths => ~3.25 lines = 1 eighth)
    const contentLines = currentSceneLines.filter((l) => l.trim().length > 0);
    const contentLineCount = contentLines.length;
    const eighths = Math.max(1, Math.ceil((contentLineCount / 26) * 8));

    currentScene.pagesEighths = eighths;
    currentScene.formattedPages = formatEighths(eighths);
    currentScene.rawScript = currentSceneLines.join('\n');

    // Parse elements within scene (characters, dialogues, action, transitions)
    currentScene.elements = parseSceneElements(currentSceneLines);

    // Extract metadata from lines if specified via இடம்: / நேரம்:
    for (const l of currentSceneLines) {
      const trimmed = l.trim();
      if (trimmed.startsWith('இடம்:')) {
        const loc = trimmed.replace(/^இடம்:\s*/, '').replace(/^இடம்:\s*/, '').trim();
        if (loc) {
          currentScene.location = loc;
          currentScene.locationTa = loc;
          if (loc.includes('காடு') || loc.includes('ரோடு') || loc.includes('தெரு') || loc.includes('மலை') || loc.includes('வயல்') || loc.includes('சந்தை')) {
            currentScene.intExt = 'வெளி';
          } else if (loc.includes('வீடு') || loc.includes('அறை') || loc.includes('ஆபீஸ்') || loc.includes('நிலைய') || loc.includes('ஸ்டேஷன்') || loc.includes('கடை')) {
            currentScene.intExt = 'உள்';
          }
        }
      }
      if (trimmed.startsWith('நேரம்:')) {
        const time = trimmed.replace(/^நேரம்:\s*/, '').trim();
        if (time) currentScene.timeOfDay = time as any;
      }
    }

    // Generate synopsis from action / dialogue lines
    const actionLines = currentScene.elements
      .filter((e) => e.type === 'ACTION')
      .map((e) => e.text.trim());
    if (actionLines.length > 0) {
      currentScene.synopsis = actionLines.slice(0, 2).join(' ');
      currentScene.synopsisTa = currentScene.synopsis;
    } else {
      currentScene.synopsis = `${currentScene.intExt}. ${currentScene.location} - ${currentScene.timeOfDay}`;
      currentScene.synopsisTa = currentScene.synopsis;
    }

    scenes.push(currentScene);
    currentScene = null;
    currentSceneLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for English scene heading
    const engMatch = trimmed.match(ENGLISH_SLUG_REGEX);
    // Check for Tamil inline scene heading
    const tamInlineMatch = trimmed.match(TAMIL_INLINE_SLUG_REGEX);
    // Check for Tamil scene break (காட்சி: 1, காட்சி 2, காட்சி: 6 இடம்: ...)
    const tamBreakMatch = trimmed.match(TAMIL_SCENE_BREAK_REGEX);

    if (engMatch || tamInlineMatch || tamBreakMatch) {
      // Commit previous scene
      if (currentScene) {
        commitScene();
      }

      if (engMatch) {
        const sceneNum = engMatch[1] || engMatch[5] || String(sceneIndex);
        const intExtRaw = engMatch[2].toUpperCase().replace(/\.$/, '');
        const intExt: any = intExtRaw.includes('INT') && intExtRaw.includes('EXT')
          ? 'INT/EXT'
          : intExtRaw.includes('INT')
          ? 'INT'
          : 'EXT';
        const location = (engMatch[3] || 'UNKNOWN LOCATION').trim();
        const timeOfDay: any = (engMatch[4] || 'DAY').toUpperCase();

        currentScene = {
          id: `scene-${sceneIndex}`,
          sceneNumber: sceneNum,
          intExt,
          location,
          timeOfDay,
          rawHeading: trimmed,
          pagesEighths: 1,
          formattedPages: '1/8',
          synopsis: '',
          rawScript: '',
          elements: [],
          breakdownItems: [],
          shootingDay: Math.ceil(sceneIndex / 4),
        };
      } else if (tamInlineMatch) {
        const sceneNum = tamInlineMatch[1] || String(sceneIndex);
        const intExtRaw = tamInlineMatch[2];
        const intExt: any = intExtRaw.includes('உள்/வெளி')
          ? 'உள்/வெளி'
          : intExtRaw.includes('வெளி')
          ? 'வெளி'
          : 'உள்';
        const location = (tamInlineMatch[3] || 'இடம் குறிப்பிடப்படவில்லை').trim();
        const timeOfDay: any = tamInlineMatch[4] || 'பகல்';

        currentScene = {
          id: `scene-${sceneIndex}`,
          sceneNumber: sceneNum,
          intExt,
          location,
          timeOfDay,
          rawHeading: trimmed,
          pagesEighths: 1,
          formattedPages: '1/8',
          synopsis: '',
          rawScript: '',
          elements: [],
          breakdownItems: [],
          shootingDay: Math.ceil(sceneIndex / 4),
        };
      } else if (tamBreakMatch) {
        const sceneNum = tamBreakMatch[1] || String(sceneIndex);
        let loc = 'காடு / இடம்';
        let time: any = 'பகல்';
        let intExt: any = 'உள்/வெளி';

        const locMatch = trimmed.match(/இடம்\s*:\s*([^நேரம்\n]+)/);
        if (locMatch) {
          loc = locMatch[1].replace(/^இடம்:\s*/, '').trim();
        }
        const timeMatch = trimmed.match(/நேரம்\s*:\s*([^\n]+)/);
        if (timeMatch) {
          time = timeMatch[1].trim();
        }

        if (loc.includes('காடு') || loc.includes('ரோடு') || loc.includes('தெரு') || loc.includes('மலை') || loc.includes('வயல்') || loc.includes('சந்தை')) {
          intExt = 'வெளி';
        } else if (loc.includes('வீடு') || loc.includes('அறை') || loc.includes('ஆபீஸ்') || loc.includes('நிலைய') || loc.includes('ஸ்டேஷன்') || loc.includes('கடை')) {
          intExt = 'உள்';
        }

        currentScene = {
          id: `scene-${sceneIndex}`,
          sceneNumber: sceneNum,
          intExt,
          location: loc,
          locationTa: loc,
          timeOfDay: time,
          rawHeading: trimmed,
          pagesEighths: 1,
          formattedPages: '1/8',
          synopsis: '',
          rawScript: '',
          elements: [],
          breakdownItems: [],
          shootingDay: Math.ceil(sceneIndex / 4),
        };
      }

      sceneIndex++;
      currentSceneLines.push(line);
    } else {
      if (currentScene) {
        currentSceneLines.push(line);
      } else if (trimmed.length > 0) {
        // Preamble before first scene heading: start Scene 1
        currentScene = {
          id: `scene-${sceneIndex}`,
          sceneNumber: String(sceneIndex),
          intExt: 'உள்/வெளி',
          location: 'தொடக்கக் காட்சி',
          timeOfDay: 'பகல்',
          rawHeading: 'காட்சி 1: தொடக்கம்',
          pagesEighths: 1,
          formattedPages: '1/8',
          synopsis: '',
          rawScript: '',
          elements: [],
          breakdownItems: [],
          shootingDay: 1,
        };
        sceneIndex++;
        currentSceneLines.push(line);
      }
    }
  }

  // Commit last scene
  if (currentScene) {
    commitScene();
  }

  return scenes;
}

export function parseSceneElements(lines: string[]): ScriptElement[] {
  const elements: ScriptElement[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    // Check for Scene Slugline
    if (
      ENGLISH_SLUG_REGEX.test(trimmed) ||
      TAMIL_INLINE_SLUG_REGEX.test(trimmed) ||
      TAMIL_SCENE_BREAK_REGEX.test(trimmed)
    ) {
      elements.push({
        id: `el-${i}`,
        type: 'SLUGLINE',
        text: trimmed,
      });
      continue;
    }

    // Check for Transitions (CUT, FADE OUT, DISSOLVE, இடைவேளை, முற்றும்)
    if (/^(cut|curt|fead out|fead in|fade in|fade out|dissolve|dissollve|dessolve|bryht|இடைவேளை|முற்றும்)/i.test(trimmed)) {
      elements.push({
        id: `el-${i}`,
        type: 'TRANSITION',
        text: trimmed.toUpperCase(),
      });
      continue;
    }

    // Check for Character Dialogues (e.g. "ரங்கா:", "சீதா:", "சுரேஷ்:", "போலீஸ்:", "ஆள் 1:")
    const inlineCharMatch = trimmed.match(/^([^:\n]{2,25})\s*:\s*(.+)$/);
    if (inlineCharMatch && !trimmed.startsWith('இடம்:') && !trimmed.startsWith('நேரம்:') && !trimmed.startsWith('காட்சி:') && !trimmed.startsWith('நடிகர்கள்:')) {
      const charName = inlineCharMatch[1].trim();
      const dialogueText = inlineCharMatch[2].trim();

      elements.push({
        id: `el-${i}-c`,
        type: 'CHARACTER',
        text: charName.toUpperCase(),
      });

      elements.push({
        id: `el-${i}-d`,
        type: 'DIALOGUE',
        text: dialogueText,
      });
      continue;
    }

    // Check for standard centered Character Heading
    const isAllUpper = trimmed.length <= 30 && trimmed === trimmed.toUpperCase() && !trimmed.includes('.') && /^[A-Z\s]+$/.test(trimmed);
    const isTamilCharHeading = /^(ரங்கா|சீதா|சுரேஷ்|காங்கேயன்|கனியன்|வேங்கடாசலபதி|நரசிம்மா|ஜெயராமன்|சங்கவி|கமிஷனர்|போலீஸ்|ஆள்|மனைவி|கன்னியம்மா|முனியப்பன்|சந்துரு|விக்ரம்)$/.test(trimmed);

    if (isAllUpper || isTamilCharHeading) {
      elements.push({
        id: `el-${i}`,
        type: 'CHARACTER',
        text: trimmed,
      });
      continue;
    }

    // Check for Parentheticals
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      elements.push({
        id: `el-${i}`,
        type: 'PARENTHETICAL',
        text: trimmed,
      });
      continue;
    }

    // Default Action block
    elements.push({
      id: `el-${i}`,
      type: 'ACTION',
      text: trimmed,
    });
  }

  return elements;
}

/**
 * Exact printable height budgeting for US Letter / A4 physical paper sheets
 * Available printable content area = ~820px inside 1056px page.
 */
function estimateElementHeight(el: ScriptElement): number {
  switch (el.type) {
    case 'SLUGLINE':
      return 52;
    case 'CHARACTER':
      return 30;
    case 'PARENTHETICAL':
      return 20;
    case 'DIALOGUE': {
      const lines = Math.max(1, Math.ceil(el.text.length / 44));
      return lines * 21 + 10;
    }
    case 'TRANSITION':
      return 32;
    case 'ACTION':
    default: {
      const lines = Math.max(1, Math.ceil(el.text.length / 64));
      return lines * 21 + 8;
    }
  }
}

const MAX_PRINTABLE_HEIGHT = 820;

export function paginateScript(scenes: Scene[]): ScriptPage[] {
  if (!scenes || scenes.length === 0) return [];

  const pages: ScriptPage[] = [];
  let currentPageNumber = 1;
  let currentHeightOnPage = 0;
  let currentPageItems: ScriptPageItem[] = [];
  let currentSceneNumbers = new Set<string>();

  const pushPage = () => {
    if (currentPageItems.length > 0) {
      pages.push({
        pageNumber: currentPageNumber,
        items: [...currentPageItems],
        sceneNumbers: Array.from(currentSceneNumbers),
      });
      currentPageNumber++;
      currentHeightOnPage = 0;
      currentPageItems = [];
      currentSceneNumbers = new Set();
    }
  };

  for (const scene of scenes) {
    scene.startPage = currentPageNumber;

    for (let elIndex = 0; elIndex < scene.elements.length; elIndex++) {
      const el = scene.elements[elIndex];
      const elHeight = estimateElementHeight(el);

      // Orphan protection for CHARACTER cues:
      // If adding CHARACTER + its subsequent DIALOGUE overflows the page,
      // break before the CHARACTER cue so both stay together on the next sheet.
      if (el.type === 'CHARACTER') {
        const nextEl = scene.elements[elIndex + 1];
        const nextHeight = nextEl && nextEl.type === 'DIALOGUE' ? estimateElementHeight(nextEl) : 35;
        if (currentHeightOnPage + elHeight + nextHeight > MAX_PRINTABLE_HEIGHT && currentHeightOnPage >= 450) {
          pushPage();
        }
      } else if (currentHeightOnPage + elHeight > MAX_PRINTABLE_HEIGHT && currentHeightOnPage >= 500) {
        pushPage();
      }

      currentPageItems.push({
        sceneId: scene.id,
        sceneNumber: scene.sceneNumber,
        element: el,
      });

      currentSceneNumbers.add(scene.sceneNumber);
      currentHeightOnPage += elHeight;
    }

    scene.endPage = currentPageNumber;
  }

  // Push final page
  pushPage();

  return pages;
}
