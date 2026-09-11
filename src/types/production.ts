export type Language = 'en' | 'ta';

export type BreakdownCategory =
  | 'CAST'
  | 'EXTRAS'
  | 'STUNTS'
  | 'VEHICLES'
  | 'PROPS'
  | 'SFX'
  | 'WARDROBE'
  | 'MAKEUP'
  | 'ANIMALS'
  | 'SOUND'
  | 'SET_DRESSING'
  | 'GREENERY'
  | 'SPECIAL_EQUIPMENT'
  | 'LIGHTING_GRIP'
  | 'SAFETY';

export interface CategoryMeta {
  key: BreakdownCategory;
  nameEn: string;
  nameTa: string;
  color: string;
  bgColor: string;
  borderColor: string;
  iconName: string;
}

export const CATEGORY_REGISTRY: Record<BreakdownCategory, CategoryMeta> = {
  CAST: {
    key: 'CAST',
    nameEn: 'Cast / Speaking',
    nameTa: 'நடிகர்கள்',
    color: '#f87171', // Red
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    iconName: 'UserCheck',
  },
  EXTRAS: {
    key: 'EXTRAS',
    nameEn: 'Extras / Atmosphere',
    nameTa: 'துணை நடிகர்கள் / கூட்டம்',
    color: '#fde047', // Yellow
    bgColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: '#eab308',
    iconName: 'Users',
  },
  STUNTS: {
    key: 'STUNTS',
    nameEn: 'Stunts & Action',
    nameTa: 'சண்டைப் பயிற்சி / ஆக்ஷன்',
    color: '#fb923c', // Orange
    bgColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: '#f97316',
    iconName: 'Flame',
  },
  VEHICLES: {
    key: 'VEHICLES',
    nameEn: 'Vehicles / Picture Cars',
    nameTa: 'வாகனங்கள் / கார்கள்',
    color: '#f472b6', // Pink
    bgColor: 'rgba(236, 72, 153, 0.15)',
    borderColor: '#ec4899',
    iconName: 'Car',
  },
  PROPS: {
    key: 'PROPS',
    nameEn: 'Props / Hand Props',
    nameTa: 'பொருட்கள் (Props)',
    color: '#c084fc', // Purple
    bgColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: '#a855f7',
    iconName: 'Package',
  },
  SFX: {
    key: 'SFX',
    nameEn: 'Special Effects (SFX)',
    nameTa: 'சிறப்பு விளைவுகள் (SFX)',
    color: '#60a5fa', // Blue
    bgColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3b82f6',
    iconName: 'Sparkles',
  },
  WARDROBE: {
    key: 'WARDROBE',
    nameEn: 'Costumes / Wardrobe',
    nameTa: 'உடைகள் / ஆடை வடிவமைப்பு',
    color: '#fbbf24', // Amber
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
    iconName: 'Shirt',
  },
  MAKEUP: {
    key: 'MAKEUP',
    nameEn: 'Makeup & Hair / Prosthetics',
    nameTa: 'ஒப்பனை & சிகை அலங்காரம்',
    color: '#d97706', // Brownish Amber
    bgColor: 'rgba(217, 119, 6, 0.15)',
    borderColor: '#d97706',
    iconName: 'Palette',
  },
  ANIMALS: {
    key: 'ANIMALS',
    nameEn: 'Animals & Handlers',
    nameTa: 'விலங்குகள் & கையாளுபவர்கள்',
    color: '#a3e635', // Lime/Green
    bgColor: 'rgba(132, 204, 22, 0.15)',
    borderColor: '#84cc16',
    iconName: 'Cat',
  },
  SOUND: {
    key: 'SOUND',
    nameEn: 'Sound & Music Playback',
    nameTa: 'ஒலி & இசை குறிப்புகள்',
    color: '#2dd4bf', // Teal
    bgColor: 'rgba(20, 184, 166, 0.15)',
    borderColor: '#14b8a6',
    iconName: 'Volume2',
  },
  SET_DRESSING: {
    key: 'SET_DRESSING',
    nameEn: 'Set Dressing',
    nameTa: 'அரங்கு அலங்காரம் (Set Dressing)',
    color: '#e879f9', // Fuchsia
    bgColor: 'rgba(217, 70, 239, 0.15)',
    borderColor: '#d946ef',
    iconName: 'Home',
  },
  GREENERY: {
    key: 'GREENERY',
    nameEn: 'Greenery & Plants',
    nameTa: 'தாவரங்கள் & பசுமை',
    color: '#4ade80', // Green
    bgColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: '#22c55e',
    iconName: 'TreePine',
  },
  SPECIAL_EQUIPMENT: {
    key: 'SPECIAL_EQUIPMENT',
    nameEn: 'Camera & Special Rigs',
    nameTa: 'கேமரா & சிறப்பு கருவிகள் (Gimbal/Crane)',
    color: '#38bdf8', // Sky
    bgColor: 'rgba(14, 165, 233, 0.15)',
    borderColor: '#0ea5e9',
    iconName: 'Camera',
  },
  LIGHTING_GRIP: {
    key: 'LIGHTING_GRIP',
    nameEn: 'Lighting & Grip',
    nameTa: 'விளக்குகள் & கிரிப் (Lighting)',
    color: '#facc15', // Gold
    bgColor: 'rgba(250, 204, 21, 0.15)',
    borderColor: '#facc15',
    iconName: 'Zap',
  },
  SAFETY: {
    key: 'SAFETY',
    nameEn: 'Safety, Permits & Hazards',
    nameTa: 'பாதுகாப்பு & அனுமதி நெறிகள்',
    color: '#f43f5e', // Rose
    bgColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: '#f43f5e',
    iconName: 'AlertTriangle',
  },
};

export interface BreakdownItem {
  id: string;
  category: BreakdownCategory;
  name: string;
  nameTa?: string;
  description?: string;
  descriptionTa?: string;
  count?: number;
  isCustom?: boolean;
}

export type SceneElementType =
  | 'SLUGLINE'
  | 'ACTION'
  | 'CHARACTER'
  | 'DIALOGUE'
  | 'PARENTHETICAL'
  | 'TRANSITION'
  | 'TAMIL_HEADING';

export interface ScriptElement {
  id: string;
  type: SceneElementType;
  text: string;
}

export interface ScriptPageItem {
  sceneId: string;
  sceneNumber: string;
  element: ScriptElement;
}

export interface ScriptPage {
  pageNumber: number;
  items: ScriptPageItem[];
  sceneNumbers: string[];
}

export interface Scene {
  id: string;
  sceneNumber: string;
  intExt: 'INT' | 'EXT' | 'INT/EXT' | 'உள்' | 'வெளி' | 'உள்/வெளி';
  location: string;
  locationTa?: string;
  timeOfDay: 'DAY' | 'NIGHT' | 'DUSK' | 'DAWN' | 'CONTINUOUS' | 'பகல்' | 'இரவு' | 'மாலை' | 'விடியல்';
  rawHeading: string;
  pagesEighths: number; // e.g. 11 = 1 3/8 pages (11 eighths)
  formattedPages: string; // "1 3/8" or "5/8"
  synopsis: string;
  synopsisTa?: string;
  rawScript: string;
  elements: ScriptElement[];
  breakdownItems: BreakdownItem[];
  shootingDay?: number;
  notes?: string;
  startPage?: number;
  endPage?: number;
}

export interface StripboardItem {
  sceneId: string;
  order: number;
  dayNumber: number;
  locked?: boolean;
}

export type RevisionColor =
  | 'WHITE' // First Draft
  | 'BLUE' // 1st Revision
  | 'PINK' // 2nd Revision
  | 'YELLOW' // 3rd Revision
  | 'GREEN' // 4th Revision
  | 'GOLDENROD'; // 5th Revision

export interface ScriptVersion {
  id: string;
  versionNumber: number;
  versionName: string;
  versionNameTa: string;
  revisionColor: RevisionColor;
  status: 'DRAFT' | 'REVISED' | 'LOCKED' | 'SHOOTING';
  author: string;
  createdAt: string;
  scriptContent: string;
  sceneCount: number;
  pageCountEighths: number;
  scenes: Scene[];
}

export type CardType = 'image' | 'character' | 'sticky' | 'palette' | 'location' | 'audio';

export interface WhiteboardCard {
  id: string;
  type: CardType;
  x: number;
  y: number;
  width?: number;
  title: string;
  titleTa?: string;
  content: string;
  contentTa?: string;
  color?: string; // Hex or theme token
  imageUrl?: string;
  metadata?: {
    characterRole?: string;
    actorIdea?: string;
    costumeTone?: string;
    hexCodes?: string[];
    audioTrack?: string;
    locationAddress?: string;
    permitNotes?: string;
    tags?: string[];
  };
}

export interface CastCallItem {
  id: string;
  castNumber: number;
  characterName: string;
  characterNameTa?: string;
  actorName: string;
  status?: 'SW' | 'W' | 'H' | 'WF' | 'SWF';
  pickupTime: string;
  makeupTime: string;
  onSetTime: string;
  notes?: string;
}

export interface ExtrasCallItem {
  id: string;
  groupName: string;
  count: number;
  callTime: string;
  wardrobeNotes?: string;
}

export interface CallSheet {
  id: string;
  productionTitle: string;
  shootDay: number;
  totalShootDays: number;
  date: string;
  callTime: string;
  breakfastTime?: string;
  estimatedWrap?: string;
  director: string;
  producer: string;
  firstAd: string;
  cinematographer: string;
  productionDesigner?: string;
  stuntCoordinator?: string;
  soundMixer?: string;
  generalCrewCall: string;
  weather: string;
  sunriseSunset: string;
  hospitalName: string;
  hospitalAddress: string;
  hospitalEmergencyPhone: string;
  locationName: string;
  locationAddress: string;
  parkingInstructions: string;
  scheduledScenes: string[]; // scene IDs
  castCalls: CastCallItem[];
  extrasCalls?: ExtrasCallItem[];
  stuntSfxNotes?: string;
  cameraNotes?: string;
  cateringNotes?: string;
  tomorrowPreview?: string;
  advancedScheduleNotes: string;
}

export interface DiffResult {
  sceneId: string;
  sceneNumber: string;
  status: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';
  titleA?: string;
  titleB?: string;
  textA?: string;
  textB?: string;
  addedItems: BreakdownItem[];
  removedItems: BreakdownItem[];
  pageShiftEighths: number;
}

export type AnnotationType = 'highlight' | 'pen' | 'text' | 'rect' | 'note';

export interface DocumentAnnotation {
  id: string;
  documentId: string;
  pageNumber: number;
  type: AnnotationType;
  color: string;
  strokeWidth?: number;
  opacity?: number;
  // For freehand drawing
  points?: Array<{ x: number; y: number }>;
  // For rect / highlight bounding box
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // For text label / sticky note
  text?: string;
  author?: string;
  createdAt: string;
}

export interface ProductionDocument {
  id: string;
  title: string;
  titleTa?: string;
  category: 'SCRIPT' | 'LOOKBOOK' | 'CALLSHEET' | 'PERMIT' | 'SAFETY' | 'CONTRACT' | 'OTHER';
  fileName: string;
  fileSize?: string;
  pageCount: number;
  uploadedAt: string;
  pdfDataUrl?: string; // base64 / blob URL for uploaded PDFs
  builtInType?: 'lookbook' | 'callsheet' | 'safety' | 'permit' | 'contract' | 'script';
  annotations: DocumentAnnotation[];
}
