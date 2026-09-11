import { ScriptVersion, WhiteboardCard, CallSheet, Scene } from '../types/production';
import { SAMPLE_SCRIPTS } from './sampleScripts';
import { parseScreenplay } from './scriptParser';

const VERSIONS_KEY = 'cinebreak_script_versions';
const ACTIVE_VERSION_ID_KEY = 'cinebreak_active_version_id';
const WHITEBOARD_KEY = 'cinebreak_whiteboard_cards';
const CALLSHEET_KEY = 'cinebreak_active_callsheet';

export function getScriptVersions(): ScriptVersion[] {
  const data = localStorage.getItem(VERSIONS_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse script versions from storage', e);
    }
  }

  // Initial seed with Tamil & Hollywood sample versions
  const tamilSample = SAMPLE_SCRIPTS[0];
  const englishSample = SAMPLE_SCRIPTS[1];

  const tamilScenes = parseScreenplay(tamilSample.rawScript);
  const englishScenes = parseScreenplay(englishSample.rawScript);

  const initialVersions: ScriptVersion[] = [
    {
      id: 'ver-1-white',
      versionNumber: 1,
      versionName: 'Draft 1 - White (Initial Production Draft)',
      versionNameTa: 'பதிப்பு 1 - வெள்ளை (தொடக்க தயாரிப்பு வரைவு)',
      revisionColor: 'WHITE',
      status: 'SHOOTING',
      author: 'இயக்குனர் கார்த்திக் (Dir. Karthik)',
      createdAt: new Date().toISOString(),
      scriptContent: tamilSample.rawScript,
      sceneCount: tamilScenes.length,
      pageCountEighths: tamilScenes.reduce((acc, s) => acc + s.pagesEighths, 0),
      scenes: tamilScenes,
    },
    {
      id: 'ver-2-blue',
      versionNumber: 2,
      versionName: 'Revision 2 - Blue (Action Sequence Expansion)',
      versionNameTa: 'பதிப்பு 2 - நீலம் (கூடுதல் சண்டைக்காட்சிகள்)',
      revisionColor: 'BLUE',
      status: 'REVISED',
      author: 'இயக்குனர் கார்த்திக் & சண்டைப்பயிற்சி குழு',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      scriptContent: tamilSample.rawScript + `\n\nகாட்சி 4: வெளி. மதுரை புறவழிச்சாலை - இரவு\n\nகடும் மழையில் பொலிரோ கார்கள் துரத்துகின்றன. ஆதி லாரியின் மேல் தாவி ஏறுகிறான்.\n\nஆதி\nஇன்னைக்கு ஒருத்தனும் தப்ப முடியாது!`,
      sceneCount: 4,
      pageCountEighths: 7,
      scenes: parseScreenplay(tamilSample.rawScript + `\n\nகாட்சி 4: வெளி. மதுரை புறவழிச்சாலை - இரவு\n\nகடும் மழையில் பொலிரோ கார்கள் துரத்துகின்றன. ஆதி லாரியின் மேல் தாவி ஏறுகிறான்.\n\nஆதி\nஇன்னைக்கு ஒருத்தனும் தப்ப முடியாது!`),
    },
  ];

  localStorage.setItem(VERSIONS_KEY, JSON.stringify(initialVersions));
  localStorage.setItem(ACTIVE_VERSION_ID_KEY, initialVersions[0].id);
  return initialVersions;
}

export function saveScriptVersions(versions: ScriptVersion[]): void {
  localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions));
}

export function getActiveVersionId(): string {
  return localStorage.getItem(ACTIVE_VERSION_ID_KEY) || 'ver-1-white';
}

export function setActiveVersionId(id: string): void {
  localStorage.setItem(ACTIVE_VERSION_ID_KEY, id);
}

export function getActiveScriptVersion(): ScriptVersion {
  const versions = getScriptVersions();
  const activeId = getActiveVersionId();
  const found = versions.find((v) => v.id === activeId);
  return found || versions[0];
}

export function updateActiveScriptVersion(updated: Partial<ScriptVersion>): void {
  const versions = getScriptVersions();
  const activeId = getActiveVersionId();
  const index = versions.findIndex((v) => v.id === activeId);

  if (index !== -1) {
    versions[index] = { ...versions[index], ...updated };
    saveScriptVersions(versions);
  }
}

// Whiteboard cards storage
export function getWhiteboardCards(): WhiteboardCard[] {
  const data = localStorage.getItem(WHITEBOARD_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse whiteboard cards', e);
    }
  }

  // Default initial moodboard cards
  const defaultCards: WhiteboardCard[] = [
    {
      id: 'card-1',
      type: 'character',
      x: 40,
      y: 40,
      width: 280,
      title: 'ஆதி (Aadhi) - Hero Concept',
      titleTa: 'ஆதி - கதாநாயகன்',
      content: 'Rugged, intense, relentless. Costume: Drenched black shirt, veshti, silver amulet around neck. Weapon: Custom forged Aruva.',
      color: '#f87171',
      metadata: {
        characterRole: 'Protagonist',
        actorIdea: 'Suriya / Dhanush style intense screen presence',
        costumeTone: 'Dark Charcoal & Temple Gold',
        tags: ['Lead Cast', 'Combat', 'Aruva Stunt'],
      },
    },
    {
      id: 'card-2',
      type: 'palette',
      x: 350,
      y: 40,
      width: 260,
      title: 'Temple Rain - Color Grade Palette',
      titleTa: 'கோவில் மழை - வண்ணக் கலவை',
      content: 'High-contrast nocturnal look. Deep wet asphalt slate, sodium vapor yellow, neon saffron temple lanterns.',
      color: '#fbbf24',
      metadata: {
        hexCodes: ['#0f172a', '#1e293b', '#eab308', '#f97316', '#dc2626'],
        tags: ['Cinematography', 'Lighting', 'Color Grading'],
      },
    },
    {
      id: 'card-3',
      type: 'sticky',
      x: 640,
      y: 40,
      width: 260,
      title: 'Climax Bridge Stunt Notes',
      titleTa: 'க்ளைமாக்ஸ் பால சண்டை குறிப்புகள்',
      content: 'Scene 3 Vaigai Bridge: Need 2 safety boats on river standby, wire-rigs for the bridge leap, pyrotechnician for dynamite burst.',
      color: '#fb923c',
      metadata: {
        tags: ['Stunt Coordinator', 'Safety', 'Pyrotechnics'],
      },
    },
    {
      id: 'card-4',
      type: 'location',
      x: 40,
      y: 330,
      width: 320,
      title: 'Madurai Mandapam & River Bank',
      titleTa: 'மதுரை மண்டபம் & ஆற்றங்கரை',
      content: 'Ancient granite stone pillars provide cover during fight. Wet stone texture looks stunning under backlighting.',
      color: '#38bdf8',
      metadata: {
        locationAddress: 'Madurai Heritage Zone & Vaigai North Bank',
        permitNotes: 'Collector & Heritage department night permits approved',
        tags: ['Location Scout', 'Night Shoot', 'Permits'],
      },
    },
    {
      id: 'card-5',
      type: 'audio',
      x: 390,
      y: 330,
      width: 280,
      title: 'Temple Drums + Heavy Thunder BGM',
      titleTa: 'உடுக்கை & தாரை தப்பட்டை பின்னணி இசை',
      content: 'Ominous Urumi Melam and Thavil building up pace as Bolero cars arrive. Sudden drop in music during sword draw, only rain foley.',
      color: '#2dd4bf',
      metadata: {
        audioTrack: 'Urumi Melam 140 BPM + Thunder Foley',
        tags: ['Sound Design', 'BGM Cues', 'Kollywood'],
      },
    },
  ];

  localStorage.setItem(WHITEBOARD_KEY, JSON.stringify(defaultCards));
  return defaultCards;
}

export function saveWhiteboardCards(cards: WhiteboardCard[]): void {
  localStorage.setItem(WHITEBOARD_KEY, JSON.stringify(cards));
}

// Call sheet storage
export function getActiveCallSheet(): CallSheet {
  const data = localStorage.getItem(CALLSHEET_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse callsheet', e);
    }
  }

  const defaultCallSheet: CallSheet = {
    id: 'cs-day-1',
    productionTitle: 'வேட்டைக்காரன்: இரத்தக் களம் (Vettaikkaran)',
    shootDay: 1,
    totalShootDays: 32,
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    callTime: '17:00 (5:00 PM)',
    generalCrewCall: '17:30',
    director: 'கே. கார்த்திக் (K. Karthik)',
    producer: 'சன் பிக்சர்ஸ் / ரெட் ஜெயன்ட்',
    firstAd: 'வி. அருண்குமார் (1st AD)',
    cinematographer: 'ஆர். ரத்தினவேல் ISC',
    weather: 'Thunderstorms, Heavy Rain (24°C / 75°F), Wind 18 km/h',
    sunriseSunset: 'Sunrise: 06:12 AM | Sunset: 06:28 PM',
    hospitalName: 'Madurai Meenakshi Mission Hospital & Emergency Trauma Care',
    hospitalAddress: 'Lake Area, Melur Road, Madurai, Tamil Nadu 625107',
    hospitalEmergencyPhone: '+91 452 426 3000 / 108',
    locationName: 'Madurai Meenakshi Temple Street (South Tower Outer)',
    locationAddress: 'South Chithirai St, Madurai Heritage Precinct',
    parkingInstructions: 'Crew basecamp at Old Municipal Ground. Picture cars parked at Gate 3.',
    scheduledScenes: ['scene-1', 'scene-2'],
    breakfastTime: '16:00 (Evening Tiffin)',
    estimatedWrap: '05:30 AM (Dawn Wrap)',
    productionDesigner: 'டி. சந்தானம் (T. Santhanam)',
    stuntCoordinator: 'சூப்பர் சுப்பராயன் (Super Subbarayan)',
    soundMixer: 'டி. உதயகுமார் (Sync Sound)',
    castCalls: [
      {
        id: 'cc-1',
        castNumber: 1,
        characterName: 'Aadhi (ஆதி)',
        actorName: 'Hero Lead',
        status: 'SW',
        pickupTime: '16:00',
        makeupTime: '16:30',
        onSetTime: '17:45',
        notes: 'Needs body blood level 2 makeup & wet hair prep',
      },
      {
        id: 'cc-2',
        castNumber: 2,
        characterName: 'Rathinam (ரத்தினம்)',
        actorName: 'Antagonist Lead',
        status: 'SW',
        pickupTime: '17:00',
        makeupTime: '17:30',
        onSetTime: '18:15',
        notes: 'Gold jewelry, cigar, white silk shirt',
      },
      {
        id: 'cc-3',
        castNumber: 3,
        characterName: '20 Fighter Goons (சண்டைக் கலைஞர்கள்)',
        actorName: 'Stunt Union Batch A',
        status: 'SWF',
        pickupTime: '16:30',
        makeupTime: '17:00',
        onSetTime: '18:00',
        notes: 'Safety pads, rubber machetes check with Armourer',
      },
    ],
    extrasCalls: [
      {
        id: 'ex-1',
        groupName: 'Temple Festival Crowd / Devotees (கோயில் திருவிழாக் கூட்டம்)',
        count: 150,
        callTime: '17:30',
        wardrobeNotes: 'Traditional South Indian festival attire (Veshti / Cotton Sarees)',
      },
    ],
    stuntSfxNotes: '20 Rubber blunt machetes certified by Armourer. 8 Kerosene torches active. Controlled rain machine and low ground fog active.',
    cameraNotes: 'A-Cam 30ft Technocrane with 50mm Anamorphic. B-Cam Steadicam. C-Cam Phantom High-Speed (240 FPS) for spark deflections.',
    cateringNotes: 'Evening Tea/Tiffin: 16:30. Hot Midnight Dinner: 23:30. Continuous filter coffee / herbal tea station active throughout night.',
    tomorrowPreview: 'Day 2 (Night): INT. ABANDONED SUGAR MILL. Scene 3 & 4. Chase sequence with 2 Mahindra Bolero picture cars.',
    advancedScheduleNotes: 'Strict perimeter: Devotee crowd extras kept 25ft clear of stunt choreography. Fire extinguishers and paramedic ambulance positioned at East Gopuram.',
  };

  localStorage.setItem(CALLSHEET_KEY, JSON.stringify(defaultCallSheet));
  return defaultCallSheet;
}

export function saveActiveCallSheet(sheet: CallSheet): void {
  localStorage.setItem(CALLSHEET_KEY, JSON.stringify(sheet));
}
