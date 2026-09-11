import React, { useState, useMemo, useRef } from 'react';
import { Scene, ScriptPage, ScriptElement } from '../types/production';
import { useLanguage } from '../i18n/LanguageContext';
import { paginateScript, parseScreenplay, formatEighths } from '../services/scriptParser';
import { autoSectionAndFormatScreenplayWithAI } from '../services/gemini';
import {
  Search,
  Layers,
  SunMedium,
  Moon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileStack,
  ZoomIn,
  ZoomOut,
  Scissors,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  FileText,
  RotateCcw,
  Maximize2,
  Sliders,
  AlignLeft,
  Settings2,
  FolderPlus,
  RefreshCw,
} from 'lucide-react';

export type PageSize = 'A4' | 'LETTER' | 'LEGAL';
export type PageMargins = 'STANDARD' | 'SCREENPLAY' | 'NARROW';
export type LineSpacing = '1.0' | '1.15' | '1.5' | '2.0';

interface ScriptViewerProps {
  scenes: Scene[];
  selectedSceneIndex: number;
  onSelectSceneIndex: (idx: number) => void;
  onNavigateToBreakdown: (sceneId: string) => void;
  onRunAiBreakdown: (scene: Scene) => void;
  onUpdateScenes?: (newScenes: Scene[]) => void;
  isAnalyzing: boolean;
}

export const ScriptViewer: React.FC<ScriptViewerProps> = ({
  scenes,
  selectedSceneIndex,
  onSelectSceneIndex,
  onNavigateToBreakdown,
  onRunAiBreakdown,
  onUpdateScenes,
  isAnalyzing,
}) => {
  const { t, fontFamily, setFontFamily } = useLanguage();

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'continuous' | 'single'>('continuous');
  const [activePageIndex, setActivePageIndex] = useState(0);

  // Word / Google Docs Page Settings & Regulations
  const [pageSize, setPageSize] = useState<PageSize>('LETTER');
  const [margins, setMargins] = useState<PageMargins>('SCREENPLAY');
  const [fontSize, setFontSize] = useState<number>(14);
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>('1.15');
  const [zoom, setZoom] = useState<number>(100);
  const [showRuler, setShowRuler] = useState<boolean>(true);

  // Manual Scene Division & Editor State
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [isRawEditorOpen, setIsRawEditorOpen] = useState(false);
  const [rawEditorText, setRawEditorText] = useState('');
  const [splitConfirmIdx, setSplitConfirmIdx] = useState<{ sceneId: string; elementIndex: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Paginate all scenes into standard screenplay pages
  const pages: ScriptPage[] = useMemo(() => {
    return paginateScript(scenes);
  }, [scenes]);

  const currentScene = scenes[selectedSceneIndex] || scenes[0];

  const filteredScenes = scenes.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.sceneNumber.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q) ||
      s.rawHeading.toLowerCase().includes(q) ||
      (s.synopsis && s.synopsis.toLowerCase().includes(q))
    );
  });

  // Calculate physical dimensions based on Word / Docs standards
  const pageDimensions = useMemo(() => {
    switch (pageSize) {
      case 'A4':
        return { width: 794, minHeight: 1123, label: 'A4 (210 × 297 mm)' };
      case 'LEGAL':
        return { width: 816, minHeight: 1344, label: 'Legal (8.5" × 14")' };
      case 'LETTER':
      default:
        return { width: 816, minHeight: 1056, label: 'US Letter (8.5" × 11")' };
    }
  }, [pageSize]);

  // Calculate margins based on Word / Docs regulations
  const pagePadding = useMemo(() => {
    switch (margins) {
      case 'STANDARD': // 1 inch all sides
        return '48px 56px 48px 56px';
      case 'NARROW': // 0.5 inch all sides
        return '30px 36px 30px 36px';
      case 'SCREENPLAY': // 1.5 inch left (hole punch), 1.0 inch top/bottom/right
      default:
        return '44px 50px 40px 72px';
    }
  }, [margins]);

  const activeLineHeight = useMemo(() => {
    switch (lineSpacing) {
      case '1.0':
        return '1.35';
      case '1.5':
        return '1.75';
      case '2.0':
        return '2.1';
      case '1.15':
      default:
        return '1.55';
    }
  }, [lineSpacing]);

  // Jump to page of a specific scene
  const handleSelectScene = (sceneIndex: number) => {
    onSelectSceneIndex(sceneIndex);
    const targetScene = scenes[sceneIndex];
    if (targetScene && targetScene.startPage) {
      const pIndex = targetScene.startPage - 1;
      setActivePageIndex(Math.max(0, Math.min(pIndex, pages.length - 1)));

      if (viewMode === 'continuous') {
        const pageEl = document.getElementById(`script-page-${targetScene.startPage}`);
        if (pageEl) {
          pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  };

  const handleNextPage = () => {
    if (activePageIndex < pages.length - 1) {
      setActivePageIndex(activePageIndex + 1);
    }
  };

  const handlePrevPage = () => {
    if (activePageIndex > 0) {
      setActivePageIndex(activePageIndex - 1);
    }
  };

  // ==========================================
  // MANUAL SCENE DIVISION & EDITING HANDLERS
  // ==========================================

  // 1. Split a Scene at a specific element
  const handleSplitSceneAtElement = (sceneId: string, elementIndex: number) => {
    if (!onUpdateScenes) return;

    const sceneIdx = scenes.findIndex((s) => s.id === sceneId);
    if (sceneIdx === -1) return;

    const sourceScene = scenes[sceneIdx];
    const elementsBefore = sourceScene.elements.slice(0, elementIndex);
    const elementsAfter = sourceScene.elements.slice(elementIndex);

    if (elementsAfter.length === 0) return;

    // Create new scene from elementsAfter with a dedicated SLUGLINE
    const newSceneNumber = `${sourceScene.sceneNumber}B`;
    const newSceneId = `scene-${Date.now()}`;
    const newSceneHeading = `காட்சி ${newSceneNumber}: ${sourceScene.intExt} ${sourceScene.location} - ${sourceScene.timeOfDay}`;

    const newSlugline: ScriptElement = {
      id: `el-${Date.now()}-slug`,
      type: 'SLUGLINE',
      text: newSceneHeading,
    };

    const finalElementsAfter =
      elementsAfter[0]?.type === 'SLUGLINE' ? elementsAfter : [newSlugline, ...elementsAfter];

    const newScene: Scene = {
      id: newSceneId,
      sceneNumber: newSceneNumber,
      intExt: sourceScene.intExt,
      location: sourceScene.location,
      locationTa: sourceScene.locationTa,
      timeOfDay: sourceScene.timeOfDay,
      rawHeading: newSceneHeading,
      pagesEighths: Math.max(1, Math.ceil((finalElementsAfter.length / 26) * 8)),
      formattedPages: formatEighths(Math.max(1, Math.ceil((finalElementsAfter.length / 26) * 8))),
      synopsis: finalElementsAfter.find((e) => e.type === 'ACTION')?.text || sourceScene.synopsis,
      rawScript: finalElementsAfter.map((e) => e.text).join('\n'),
      elements: finalElementsAfter,
      breakdownItems: [],
      shootingDay: sourceScene.shootingDay,
    };

    // Update source scene
    const updatedSourceScene: Scene = {
      ...sourceScene,
      elements: elementsBefore,
      pagesEighths: Math.max(1, Math.ceil((elementsBefore.length / 26) * 8)),
      formattedPages: formatEighths(Math.max(1, Math.ceil((elementsBefore.length / 26) * 8))),
      rawScript: elementsBefore.map((e) => e.text).join('\n'),
    };

    const newScenes = [...scenes];
    newScenes.splice(sceneIdx, 1, updatedSourceScene, newScene);
    onUpdateScenes(newScenes);
    setSplitConfirmIdx(null);
  };

  // 2. Merge Scene with Next Scene
  const handleMergeWithNext = (sceneIndex: number) => {
    if (!onUpdateScenes || sceneIndex >= scenes.length - 1) return;

    const current = scenes[sceneIndex];
    const next = scenes[sceneIndex + 1];

    const mergedElements = [...current.elements, ...next.elements];
    const mergedScene: Scene = {
      ...current,
      elements: mergedElements,
      rawScript: `${current.rawScript}\n${next.rawScript}`,
      pagesEighths: Math.max(1, Math.ceil((mergedElements.length / 26) * 8)),
      formattedPages: formatEighths(Math.max(1, Math.ceil((mergedElements.length / 26) * 8))),
      breakdownItems: [...current.breakdownItems, ...next.breakdownItems],
    };

    const newScenes = [...scenes];
    newScenes.splice(sceneIndex, 2, mergedScene);
    onUpdateScenes(newScenes);
  };

  // 3. Renumber All Scenes Sequentially
  const handleRenumberAllScenes = () => {
    if (!onUpdateScenes) return;

    const renumbered = scenes.map((s, idx) => ({
      ...s,
      sceneNumber: String(idx + 1),
      rawHeading: s.rawHeading.replace(/^(?:காட்சி|SCENE)\s*[:\.]?\s*\w+/i, `காட்சி: ${idx + 1}`),
    }));

    onUpdateScenes(renumbered);
  };

  // 4. Save Edited Scene Metadata
  const handleSaveSceneMetadata = () => {
    if (!editingScene || !onUpdateScenes) return;

    const updated = scenes.map((s) => (s.id === editingScene.id ? editingScene : s));
    onUpdateScenes(updated);
    setEditingScene(null);
  };

  // 5. Delete a Scene
  const handleDeleteScene = (sceneId: string) => {
    if (!onUpdateScenes || scenes.length <= 1) return;
    const filtered = scenes.filter((s) => s.id !== sceneId);
    onUpdateScenes(filtered);
    onSelectSceneIndex(Math.max(0, selectedSceneIndex - 1));
  };

  // 6. Open Raw Text Screenplay Editor
  const handleOpenRawEditor = () => {
    const fullScript = scenes.map((s) => s.rawScript || s.elements.map((e) => e.text).join('\n')).join('\n\n');
    setRawEditorText(fullScript);
    setIsRawEditorOpen(true);
  };

  // 7. Apply Raw Screenplay Text
  const handleApplyRawEditor = () => {
    if (!onUpdateScenes) return;
    const parsed = parseScreenplay(rawEditorText);
    if (parsed.length > 0) {
      onUpdateScenes(parsed);
      onSelectSceneIndex(0);
      setIsRawEditorOpen(false);
    }
  };

  // 8. AI Auto-Section & Format Entire Screenplay
  const [isAutoFormatting, setIsAutoFormatting] = useState(false);
  const handleAutoSectionScreenplay = async () => {
    if (!onUpdateScenes) return;
    setIsAutoFormatting(true);
    try {
      const fullScript = scenes
        .map((s) => s.rawScript || s.elements.map((e) => e.text).join('\n'))
        .join('\n\n');
      const newScenes = await autoSectionAndFormatScreenplayWithAI(fullScript, 'ta');
      if (newScenes && newScenes.length > 0) {
        onUpdateScenes(newScenes);
        onSelectSceneIndex(0);
      }
    } catch (err) {
      console.error('Failed to auto-section screenplay with AI:', err);
    } finally {
      setIsAutoFormatting(false);
    }
  };

  // Render individual script element with visual scene dividers and hover split tools
  const renderScriptElement = (el: ScriptElement, key: string, sceneId: string, elIdx: number) => {
    const isHovered = hoveredElementId === `${sceneId}-${elIdx}`;
    const targetScene = scenes.find((s) => s.id === sceneId);

    switch (el.type) {
      case 'SLUGLINE':
        return (
          <div
            key={key}
            onMouseEnter={() => setHoveredElementId(`${sceneId}-${elIdx}`)}
            onMouseLeave={() => setHoveredElementId(null)}
            style={{
              position: 'relative',
              fontWeight: 900,
              fontSize: `${fontSize + 0.5}px`,
              color: '#000000',
              margin: '22px 0 10px 0',
              borderBottom: '1.5px solid #000000',
              paddingBottom: '3px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{el.text}</span>
            {isHovered && (
              <button
                onClick={() => {
                  if (targetScene) setEditingScene({ ...targetScene });
                }}
                className="no-print"
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '3px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Edit Scene Details"
              >
                <Edit3 size={10} />
                <span>Edit Heading</span>
              </button>
            )}
          </div>
        );

      case 'CHARACTER':
        return (
          <div
            key={key}
            onMouseEnter={() => setHoveredElementId(`${sceneId}-${elIdx}`)}
            onMouseLeave={() => setHoveredElementId(null)}
            style={{
              position: 'relative',
              textAlign: 'center',
              fontWeight: 800,
              color: '#000000',
              marginTop: '12px',
              marginBottom: '2px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontSize: `${fontSize}px`,
            }}
          >
            <span>{el.text}</span>
          </div>
        );

      case 'PARENTHETICAL':
        return (
          <div
            key={key}
            style={{
              textAlign: 'center',
              color: '#475569',
              fontSize: `${fontSize - 1.5}px`,
              fontStyle: 'italic',
              marginBottom: '2px',
            }}
          >
            {el.text}
          </div>
        );

      case 'DIALOGUE':
        return (
          <div
            key={key}
            onMouseEnter={() => setHoveredElementId(`${sceneId}-${elIdx}`)}
            onMouseLeave={() => setHoveredElementId(null)}
            style={{
              position: 'relative',
              maxWidth: '430px',
              margin: '0 auto 10px auto',
              color: '#0f172a',
              textAlign: 'left',
              fontSize: `${fontSize}px`,
              lineHeight: activeLineHeight,
            }}
          >
            <div>{el.text}</div>

            {/* Visual Cutline / Split Here Quick Trigger on Hover */}
            {isHovered && elIdx > 0 && (
              <div
                className="no-print"
                style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '-40px',
                  right: '-40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 20,
                }}
              >
                <div style={{ flex: 1, height: '1px', backgroundColor: '#ef4444', borderTop: '1px dashed #ef4444' }} />
                <button
                  onClick={() => handleSplitSceneAtElement(sceneId, elIdx)}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #fca5a5',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '10px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    margin: '0 8px',
                  }}
                  title="Split into new scene at this point"
                >
                  <Scissors size={10} />
                  <span>✂️ Split Scene Here (இங்கு காட்சியைப் பிரி)</span>
                </button>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#ef4444', borderTop: '1px dashed #ef4444' }} />
              </div>
            )}
          </div>
        );

      case 'TRANSITION':
        return (
          <div
            key={key}
            style={{
              textAlign: 'right',
              color: '#0284c7',
              fontWeight: 800,
              margin: '12px 0',
              fontSize: `${fontSize - 1}px`,
              textTransform: 'uppercase',
            }}
          >
            {el.text}
          </div>
        );

      default: // ACTION
        return (
          <div
            key={key}
            onMouseEnter={() => setHoveredElementId(`${sceneId}-${elIdx}`)}
            onMouseLeave={() => setHoveredElementId(null)}
            style={{
              position: 'relative',
              color: '#1e293b',
              margin: '8px 0',
              textAlign: 'left',
              fontSize: `${fontSize}px`,
              lineHeight: activeLineHeight,
            }}
          >
            <div>{el.text}</div>

            {/* Visual Cutline / Split Here Quick Trigger on Hover */}
            {isHovered && elIdx > 0 && (
              <div
                className="no-print"
                style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '-20px',
                  right: '-20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 20,
                }}
              >
                <div style={{ flex: 1, height: '1px', backgroundColor: '#ef4444', borderTop: '1px dashed #ef4444' }} />
                <button
                  onClick={() => handleSplitSceneAtElement(sceneId, elIdx)}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #fca5a5',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '10px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    margin: '0 8px',
                  }}
                  title="Split into new scene at this paragraph"
                >
                  <Scissors size={10} />
                  <span>✂️ Split Scene Here (இங்கு காட்சியைப் பிரி)</span>
                </button>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#ef4444', borderTop: '1px dashed #ef4444' }} />
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '290px 1fr',
        height: '100vh',
        backgroundColor: '#f1f5f9',
        overflow: 'hidden',
      }}
    >
      {/* ======================================================== */}
      {/* LEFT SIDEBAR: SCENE LIST NAVIGATOR & TOOLS               */}
      {/* ======================================================== */}
      <div
        className="no-print"
        style={{
          borderRight: '1px solid #cbd5e1',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Sidebar Header & Scene Division Action Tools */}
        <div style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', letterSpacing: '0.05em' }}>
              SCENE WORKSHOP ({scenes.length})
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={handleRenumberAllScenes}
                className="btn-clean-subtle"
                style={{ padding: '3px 6px', fontSize: '10px', fontWeight: 700 }}
                title="Renumber scenes sequentially 1, 2, 3..."
              >
                <RefreshCw size={10} />
                <span>1..N</span>
              </button>
              <button
                onClick={handleOpenRawEditor}
                className="btn-clean-subtle"
                style={{ padding: '3px 6px', fontSize: '10px', fontWeight: 700 }}
                title="Edit script text directly"
              >
                <FileText size={10} />
                <span>Edit Script</span>
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ffffff',
              borderRadius: '5px',
              padding: '6px 10px',
              border: '1px solid #cbd5e1',
            }}
          >
            <Search size={13} color="#94a3b8" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scene, location, cast..."
              style={{
                background: 'none',
                border: 'none',
                color: '#0f172a',
                fontSize: '12px',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* Scene Cards List with Scene Manipulation Options */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filteredScenes.map((scene, idx) => {
            const isSelected = scenes.indexOf(scene) === selectedSceneIndex;
            const isNight =
              scene.timeOfDay.toUpperCase().includes('NIGHT') ||
              scene.timeOfDay.includes('இரவு');
            const itemsCount = scene.breakdownItems?.length || 0;

            return (
              <div
                key={scene.id}
                onClick={() => handleSelectScene(scenes.indexOf(scene))}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#f8fafc' : '#ffffff',
                  border: isSelected ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                  boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.12s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 900,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#0f172a',
                        color: '#ffffff',
                      }}
                    >
                      SC. {scene.sceneNumber}
                    </span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        color: scene.intExt.includes('INT') || scene.intExt.includes('உள்') ? '#0284c7' : '#d97706',
                      }}
                    >
                      {scene.intExt}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isNight ? <Moon size={12} color="#6366f1" /> : <SunMedium size={12} color="#d97706" />}
                    <span
                      style={{
                        fontSize: '10px',
                        color: '#0f172a',
                        fontWeight: 800,
                        backgroundColor: '#e2e8f0',
                        padding: '1px 5px',
                        borderRadius: '3px',
                      }}
                    >
                      pg. {scene.startPage || 1}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#1e293b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: '4px',
                  }}
                >
                  {scene.location}
                </div>

                {/* Scene Action Footer: Edit, Merge with Next, Delete */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '6px',
                    borderTop: '1px solid #f1f5f9',
                    marginTop: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      color: itemsCount > 0 ? '#16a34a' : '#94a3b8',
                    }}
                  >
                    {itemsCount > 0 ? `${itemsCount} breakdown items` : 'Unbroken'}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setEditingScene({ ...scene })}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#64748b',
                        padding: '2px',
                        cursor: 'pointer',
                      }}
                      title="Edit Scene Heading"
                    >
                      <Edit3 size={11} />
                    </button>
                    {idx < scenes.length - 1 && (
                      <button
                        onClick={() => handleMergeWithNext(idx)}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: '#64748b',
                          padding: '2px',
                          cursor: 'pointer',
                        }}
                        title="Merge with Next Scene"
                      >
                        <Layers size={11} />
                      </button>
                    )}
                    {scenes.length > 1 && (
                      <button
                        onClick={() => handleDeleteScene(scene.id)}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: '#ef4444',
                          padding: '2px',
                          cursor: 'pointer',
                        }}
                        title="Delete Scene"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MAIN DOCUMENT STUDIO (WORD / DOCS SPECIFICATION)         */}
      {/* ======================================================== */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Word / Google Docs Toolbar */}
        <div
          className="no-print"
          style={{
            padding: '8px 16px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            zIndex: 10,
          }}
        >
          {/* Group 1: Page Navigation & View Mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '5px', padding: '2px' }}>
              <button
                onClick={() => setViewMode('continuous')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: viewMode === 'continuous' ? '#ffffff' : 'transparent',
                  color: viewMode === 'continuous' ? '#0f172a' : '#64748b',
                  boxShadow: viewMode === 'continuous' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <FileStack size={12} />
                <span>Pages</span>
              </button>
              <button
                onClick={() => setViewMode('single')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: viewMode === 'single' ? '#ffffff' : 'transparent',
                  color: viewMode === 'single' ? '#0f172a' : '#64748b',
                  boxShadow: viewMode === 'single' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <BookOpen size={12} />
                <span>Single</span>
              </button>
            </div>

            {/* Page Jumper Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <button
                onClick={handlePrevPage}
                disabled={activePageIndex === 0}
                className="btn-clean"
                style={{ padding: '4px 6px', opacity: activePageIndex === 0 ? 0.3 : 1 }}
              >
                <ChevronLeft size={13} />
              </button>

              <select
                value={activePageIndex}
                onChange={(e) => {
                  const pIdx = Number(e.target.value);
                  setActivePageIndex(pIdx);
                  if (viewMode === 'continuous') {
                    const pageEl = document.getElementById(`script-page-${pIdx + 1}`);
                    if (pageEl) pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  cursor: 'pointer',
                  color: '#0f172a',
                  outline: 'none',
                }}
              >
                {pages.map((p, idx) => (
                  <option key={p.pageNumber} value={idx}>
                    Page {p.pageNumber} of {pages.length} ({p.sceneNumbers.map((s) => `Sc. ${s}`).join(', ')})
                  </option>
                ))}
              </select>

              <button
                onClick={handleNextPage}
                disabled={activePageIndex >= pages.length - 1}
                className="btn-clean"
                style={{ padding: '4px 6px', opacity: activePageIndex >= pages.length - 1 ? 0.3 : 1 }}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Group 2: Word / Docs Format Controls (Page Size, Margins, Font, Spacing, Zoom) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Page Size Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700 }}>Size:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as PageSize)}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 6px',
                  cursor: 'pointer',
                  color: '#0f172a',
                }}
              >
                <option value="LETTER">US Letter (8.5" × 11")</option>
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="LEGAL">Legal (8.5" × 14")</option>
              </select>
            </div>

            {/* Margins Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700 }}>Margins:</span>
              <select
                value={margins}
                onChange={(e) => setMargins(e.target.value as PageMargins)}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 6px',
                  cursor: 'pointer',
                  color: '#0f172a',
                }}
              >
                <option value="SCREENPLAY">Screenplay (1.5" Left / 1" R)</option>
                <option value="STANDARD">Standard 1.0" Normal</option>
                <option value="NARROW">Narrow 0.5"</option>
              </select>
            </div>

            {/* Font Size Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: '#f1f5f9', borderRadius: '4px', padding: '1px 3px' }}>
              <button
                onClick={() => setFontSize((f) => Math.max(10, f - 1))}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '11px', fontWeight: 800 }}
                title="Decrease font size"
              >
                -
              </button>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#0f172a',
                  cursor: 'pointer',
                  outline: 'none',
                  padding: '2px',
                }}
              >
                {[10, 11, 12, 13, 14, 15, 16, 18, 20].map((pt) => (
                  <option key={pt} value={pt}>
                    {pt} pt
                  </option>
                ))}
              </select>
              <button
                onClick={() => setFontSize((f) => Math.min(22, f + 1))}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '11px', fontWeight: 800 }}
                title="Increase font size"
              >
                +
              </button>
            </div>

            {/* Line Spacing */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700 }}>Line:</span>
              <select
                value={lineSpacing}
                onChange={(e) => setLineSpacing(e.target.value as LineSpacing)}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 6px',
                  cursor: 'pointer',
                  color: '#0f172a',
                }}
              >
                <option value="1.0">1.0 (Single)</option>
                <option value="1.15">1.15 (Docs Normal)</option>
                <option value="1.5">1.5 (Relaxed)</option>
                <option value="2.0">2.0 (Double)</option>
              </select>
            </div>

            {/* Zoom Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <button
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
                className="btn-clean-subtle"
                style={{ padding: '3px 5px' }}
                title="Zoom Out"
              >
                <ZoomOut size={12} />
              </button>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', minWidth: '36px', textAlign: 'center' }}>
                {zoom}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(175, z + 10))}
                className="btn-clean-subtle"
                style={{ padding: '3px 5px' }}
                title="Zoom In"
              >
                <ZoomIn size={12} />
              </button>
            </div>
          </div>

          {/* Group 3: AI & Breakdown Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={handleAutoSectionScreenplay}
              disabled={isAutoFormatting}
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 12px',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: isAutoFormatting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
              }}
              title="Automatically understand screenplay narrative and section into structured scenes"
            >
              <Sparkles size={12} color="#ffffff" className={isAutoFormatting ? 'animate-spin' : ''} />
              <span>{isAutoFormatting ? 'AI Sectioning Script...' : 'AI Auto-Section Script'}</span>
            </button>

            <button
              onClick={() => onRunAiBreakdown(currentScene)}
              disabled={isAnalyzing}
              className="btn-clean-dark"
              style={{ fontSize: '11.5px', padding: '5px 12px' }}
            >
              <Sparkles size={12} color="#f59e0b" />
              <span>{isAnalyzing ? t.analyzingScene : t.aiBreakdownCurrent}</span>
            </button>
            <button
              onClick={() => onNavigateToBreakdown(currentScene.id)}
              className="btn-clean"
              style={{ fontSize: '11.5px', padding: '5px 10px' }}
            >
              <Layers size={12} />
              <span>Breakdown</span>
            </button>
          </div>
        </div>

        {/* Word / Google Docs Interactive Ruler */}
        {showRuler && (
          <div
            className="no-print"
            style={{
              height: '20px',
              backgroundColor: '#e2e8f0',
              borderBottom: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              fontSize: '9px',
              color: '#64748b',
              fontWeight: 700,
              userSelect: 'none',
            }}
          >
            <div
              style={{
                width: `${pageDimensions.width * (zoom / 100)}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((inch) => (
                <div key={inch} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ height: '5px', width: '1px', backgroundColor: '#94a3b8' }} />
                  <span>{inch}"</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable Container with Word / Docs Paper Sheets */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '36px 20px',
            backgroundColor: '#e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '28px',
          }}
        >
          {pages.length === 0 ? (
            <div style={{ color: '#64748b', marginTop: '60px', fontSize: '13px' }}>No script content available.</div>
          ) : viewMode === 'continuous' ? (
            /* Continuous Sheets View */
            pages.map((page) => (
              <div
                key={page.pageNumber}
                id={`script-page-${page.pageNumber}`}
                style={{
                  width: `${pageDimensions.width}px`,
                  height: `${pageDimensions.minHeight}px`,
                  minHeight: `${pageDimensions.minHeight}px`,
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '3px',
                  padding: pagePadding,
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0,0,0,0.05)',
                  fontFamily:
                    fontFamily === 'tamil-serif'
                      ? 'Mukta Malar, serif'
                      : fontFamily === 'tamil-modern'
                      ? 'Noto Sans Tamil, sans-serif'
                      : 'Courier Prime, monospace',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {/* Standard Screenplay Top-Right Page Header */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px dashed #cbd5e1',
                      paddingBottom: '8px',
                      marginBottom: '18px',
                      fontSize: '11px',
                      color: '#64748b',
                      fontWeight: 600,
                    }}
                  >
                    <span>
                      SCENES: {page.sceneNumbers.map((s) => `SC. ${s}`).join(', ')}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                      {page.pageNumber}.
                    </span>
                  </div>

                  {/* Page Content Elements */}
                  <div>
                    {page.items.map((item, idx) =>
                      renderScriptElement(item.element, `${page.pageNumber}-${idx}`, item.sceneId, idx)
                    )}
                  </div>
                </div>

                {/* Page Bottom Footer */}
                <div
                  style={{
                    textAlign: 'center',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '8px',
                    marginTop: '16px',
                    fontSize: '10px',
                    color: '#94a3b8',
                  }}
                >
                  — CINEBREAK AI SCREENPLAY PAGE {page.pageNumber} —
                </div>
              </div>
            ))
          ) : (
            /* Single Page View */
            pages[activePageIndex] && (
              <div
                style={{
                  width: `${pageDimensions.width}px`,
                  height: `${pageDimensions.minHeight}px`,
                  minHeight: `${pageDimensions.minHeight}px`,
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '3px',
                  padding: pagePadding,
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0,0,0,0.05)',
                  fontFamily:
                    fontFamily === 'tamil-serif'
                      ? 'Mukta Malar, serif'
                      : fontFamily === 'tamil-modern'
                      ? 'Noto Sans Tamil, sans-serif'
                      : 'Courier Prime, monospace',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {/* Page Top Header */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px dashed #cbd5e1',
                      paddingBottom: '8px',
                      marginBottom: '18px',
                      fontSize: '11px',
                      color: '#64748b',
                      fontWeight: 600,
                    }}
                  >
                    <span>
                      SCENES: {pages[activePageIndex].sceneNumbers.map((s) => `SC. ${s}`).join(', ')}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                      {pages[activePageIndex].pageNumber}.
                    </span>
                  </div>

                  {/* Page Items */}
                  <div>
                    {pages[activePageIndex].items.map((item, idx) =>
                      renderScriptElement(
                        item.element,
                        `single-${idx}`,
                        item.sceneId,
                        idx
                      )
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div
                  style={{
                    textAlign: 'center',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '8px',
                    marginTop: '16px',
                    fontSize: '10px',
                    color: '#94a3b8',
                  }}
                >
                  — PAGE {pages[activePageIndex].pageNumber} OF {pages.length} —
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: EDIT SCENE HEADING / METADATA                   */}
      {/* ======================================================== */}
      {editingScene && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '24px',
              width: '460px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Edit Scene {editingScene.sceneNumber} Metadata
              </h3>
              <button
                onClick={() => setEditingScene(null)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Scene Number
                </label>
                <input
                  type="text"
                  value={editingScene.sceneNumber}
                  onChange={(e) => setEditingScene({ ...editingScene, sceneNumber: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    INT / EXT (உள் / வெளி)
                  </label>
                  <select
                    value={editingScene.intExt}
                    onChange={(e) => setEditingScene({ ...editingScene, intExt: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    <option value="உள்/வெளி">உள்/வெளி (INT/EXT)</option>
                    <option value="வெளி">வெளி (EXT)</option>
                    <option value="உள்">உள் (INT)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Time of Day (நேரம்)
                  </label>
                  <select
                    value={editingScene.timeOfDay}
                    onChange={(e) => setEditingScene({ ...editingScene, timeOfDay: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    <option value="பகல்">பகல் (DAY)</option>
                    <option value="இரவு">இரவு (NIGHT)</option>
                    <option value="மாலை">மாலை (EVENING)</option>
                    <option value="விடியல்">விடியல் (DAWN)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Location (இடம்)
                </label>
                <input
                  type="text"
                  value={editingScene.location}
                  onChange={(e) => setEditingScene({ ...editingScene, location: e.target.value, locationTa: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Synopsis (காட்சி சுருக்கம்)
                </label>
                <textarea
                  rows={3}
                  value={editingScene.synopsis || ''}
                  onChange={(e) => setEditingScene({ ...editingScene, synopsis: e.target.value, synopsisTa: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '12px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={() => setEditingScene(null)}
                className="btn-clean"
                style={{ padding: '6px 14px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSceneMetadata}
                className="btn-clean-dark"
                style={{ padding: '6px 16px' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: RAW SCRIPT TEXT EDITOR WITH LIVE RE-PARSER     */}
      {/* ======================================================== */}
      {isRawEditorOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '24px',
              width: '800px',
              maxWidth: '92vw',
              height: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Manual Screenplay Text Editor & Scene Divider
                </h3>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Insert `காட்சி: X` anywhere to split scenes. Changes will re-parse all breakdown sheets.
                </p>
              </div>
              <button
                onClick={() => setIsRawEditorOpen(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <textarea
              value={rawEditorText}
              onChange={(e) => setRawEditorText(e.target.value)}
              style={{
                flex: 1,
                width: '100%',
                padding: '14px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                lineHeight: '1.6',
                fontFamily:
                  fontFamily === 'tamil-serif'
                    ? 'Mukta Malar, serif'
                    : fontFamily === 'tamil-modern'
                    ? 'Noto Sans Tamil, sans-serif'
                    : 'Courier Prime, monospace',
                outline: 'none',
                resize: 'none',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Tip: Type `காட்சி: 1`, `காட்சி: 2` to create distinct scenes.
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setIsRawEditorOpen(false)}
                  className="btn-clean"
                  style={{ padding: '6px 14px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyRawEditor}
                  className="btn-clean-dark"
                  style={{ padding: '6px 16px' }}
                >
                  Apply & Re-Divide Scenes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
