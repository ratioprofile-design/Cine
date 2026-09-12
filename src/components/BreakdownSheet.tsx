import React, { useState, useEffect } from 'react';
import { Scene, BreakdownItem, BreakdownCategory, CATEGORY_REGISTRY } from '../types/production';
import { useLanguage } from '../i18n/LanguageContext';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Printer,
  CheckSquare,
  Square,
  Play,
  Pause,
  XCircle,
  Clock,
  Layers,
  Filter,
  CheckCircle2,
  ListFilter,
  Check,
} from 'lucide-react';
import {
  translateToTamil,
  translateDescriptionToTamil,
  translateIntExtToTamil,
  translateTimeOfDayToTamil,
  translateLocationToTamil,
} from '../services/tamilTranslator';
import { batchBreakdownManager, BatchProgressState } from '../services/batchBreakdownService';

interface BreakdownSheetProps {
  scenes: Scene[];
  selectedSceneIndex: number;
  onSelectSceneIndex: (idx: number) => void;
  onRunAiBreakdown: (scene: Scene) => void;
  onRunBatchBreakdown?: (scenesToProcess: Scene[]) => void;
  onAddItem: (sceneId: string, item: BreakdownItem) => void;
  onDeleteItem: (sceneId: string, itemId: string) => void;
  isAnalyzing: boolean;
}

export const BreakdownSheet: React.FC<BreakdownSheetProps> = ({
  scenes,
  selectedSceneIndex,
  onSelectSceneIndex,
  onRunAiBreakdown,
  onRunBatchBreakdown,
  onAddItem,
  onDeleteItem,
  isAnalyzing,
}) => {
  const { t, language, effectiveBreakdownLang } = useLanguage();
  const isTamilBreakdown = effectiveBreakdownLang === 'ta';
  const isTamil = language === 'ta';

  const [activeCategoryModal, setActiveCategoryModal] = useState<BreakdownCategory | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  // Batch Selection State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(
    () => new Set(scenes.map((s) => s.id))
  );
  const [sceneFilter, setSceneFilter] = useState<'ALL' | 'UNBROKEN' | 'BROKEN'>('ALL');

  // Background Batch Progress State
  const [batchState, setBatchState] = useState<BatchProgressState>(() =>
    batchBreakdownManager.getState()
  );

  useEffect(() => {
    return batchBreakdownManager.subscribe((state) => {
      setBatchState(state);
    });
  }, []);

  // Sync selectedSceneIds if scenes change
  useEffect(() => {
    setSelectedSceneIds((prev) => {
      const valid = new Set<string>();
      scenes.forEach((s) => {
        if (prev.has(s.id)) valid.add(s.id);
      });
      if (valid.size === 0) {
        scenes.forEach((s) => valid.add(s.id));
      }
      return valid;
    });
  }, [scenes.length]);

  const currentScene = scenes[selectedSceneIndex] || scenes[0];

  if (!currentScene) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#a1a1aa', fontSize: '13px' }}>
        {isTamil ? 'காட்சிகள் எதுவும் கிடைக்கவில்லை.' : 'No scenes available.'}
      </div>
    );
  }

  const handleNextScene = () => {
    if (selectedSceneIndex < scenes.length - 1) {
      onSelectSceneIndex(selectedSceneIndex + 1);
    }
  };

  const handlePrevScene = () => {
    if (selectedSceneIndex > 0) {
      onSelectSceneIndex(selectedSceneIndex - 1);
    }
  };

  const handleTriggerAi = async () => {
    await onRunAiBreakdown(currentScene);
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#0284c7', '#38bdf8', '#0f172a'],
    });
  };

  // Batch Breakdown Triggers
  const handleStartBreakdownAll = () => {
    if (onRunBatchBreakdown) {
      onRunBatchBreakdown(scenes);
    }
  };

  const handleStartBreakdownSelected = () => {
    const targetScenes = scenes.filter((s) => selectedSceneIds.has(s.id));
    if (targetScenes.length === 0) return;
    if (onRunBatchBreakdown) {
      onRunBatchBreakdown(targetScenes);
    }
    setIsBatchModalOpen(false);
  };

  const handleStartBreakdownUnbroken = () => {
    const unbroken = scenes.filter((s) => !s.breakdownItems || s.breakdownItems.length === 0);
    if (unbroken.length === 0) {
      alert(isTamil ? 'அனைத்து காட்சிகளுக்கும் ஏற்கனவே குறிப்புகள் உள்ளன!' : 'All scenes already have breakdown items!');
      return;
    }
    if (onRunBatchBreakdown) {
      onRunBatchBreakdown(unbroken);
    }
    setIsBatchModalOpen(false);
  };

  const toggleSelectAll = () => {
    if (selectedSceneIds.size === scenes.length) {
      setSelectedSceneIds(new Set());
    } else {
      setSelectedSceneIds(new Set(scenes.map((s) => s.id)));
    }
  };

  const toggleSceneSelection = (id: string) => {
    setSelectedSceneIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !activeCategoryModal) return;

    const newItem: BreakdownItem = {
      id: `item-${Date.now()}`,
      category: activeCategoryModal,
      name: newItemName.trim(),
      nameTa: isTamil ? newItemName.trim() : translateToTamil(newItemName.trim()),
      description: newItemDesc.trim() || undefined,
      descriptionTa: isTamil ? newItemDesc.trim() : (newItemDesc.trim() ? translateDescriptionToTamil(newItemDesc.trim()) : undefined),
      count: 1,
    };

    onAddItem(currentScene.id, newItem);
    setNewItemName('');
    setNewItemDesc('');
    setActiveCategoryModal(null);
  };

  const categories: BreakdownCategory[] = [
    'CAST',
    'EXTRAS',
    'STUNTS',
    'VEHICLES',
    'PROPS',
    'SFX',
    'WARDROBE',
    'MAKEUP',
    'ANIMALS',
    'SOUND',
    'SET_DRESSING',
    'GREENERY',
    'SPECIAL_EQUIPMENT',
    'LIGHTING_GRIP',
    'SAFETY',
  ];

  const itemsByCategory = (category: BreakdownCategory) => {
    return (currentScene.breakdownItems || []).filter((i) => i.category === category);
  };

  const totalItems = (currentScene.breakdownItems || []).length;
  const unbrokenScenesCount = scenes.filter((s) => !s.breakdownItems || s.breakdownItems.length === 0).length;

  const displayHeading = isTamilBreakdown
    ? `காட்சி ${currentScene.sceneNumber}: ${translateIntExtToTamil(currentScene.intExt)} ${translateLocationToTamil(currentScene.location)} - ${translateTimeOfDayToTamil(currentScene.timeOfDay)}`
    : currentScene.rawHeading;

  const displaySynopsis = isTamilBreakdown
    ? (currentScene.synopsisTa || translateToTamil(currentScene.synopsis))
    : currentScene.synopsis;

  const filteredModalScenes = scenes.filter((s) => {
    const hasItems = s.breakdownItems && s.breakdownItems.length > 0;
    if (sceneFilter === 'UNBROKEN') return !hasItems;
    if (sceneFilter === 'BROKEN') return hasItems;
    return true;
  });

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#fafafa', minHeight: '100vh' }}>
      {/* Live Batch Breakdown Progress Banner */}
      {batchState.isRunning && (
        <div
          className="no-print"
          style={{
            padding: '16px 20px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(56, 189, 248, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={16} color="#38bdf8" className="animate-spin" />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.02em' }}>
                  {isTamil
                    ? `AI மொத்த குறிப்பு பிரித்தெடுத்தல் நடக்கிறது: காட்சி ${batchState.completedCount} / ${batchState.totalScenes} (${batchState.percent}%)`
                    : `AI Batch Breakdown in Progress: Scene ${batchState.completedCount} of ${batchState.totalScenes} (${batchState.percent}%)`}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {isTamil
                    ? `தற்போது பகுப்பாய்வு செய்யப்படும் காட்சி: காட்சி ${batchState.currentSceneNumber} (${batchState.currentSceneLocation})`
                    : `Currently analyzing: Scene ${batchState.currentSceneNumber} (${batchState.currentSceneLocation})`}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {batchState.estimatedSecondsRemaining > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#38bdf8', fontWeight: 700 }}>
                  <Clock size={13} />
                  <span>
                    {isTamil
                      ? `சுமார் ${batchState.estimatedSecondsRemaining} வினாடிகள் மீதம்`
                      : `~${batchState.estimatedSecondsRemaining}s remaining`}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '6px' }}>
                {batchState.isPaused ? (
                  <button
                    onClick={() => batchBreakdownManager.resume()}
                    style={{
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Play size={12} />
                    <span>{isTamil ? 'தொடர்க' : 'Resume'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => batchBreakdownManager.pause()}
                    style={{
                      backgroundColor: '#334155',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Pause size={12} />
                    <span>{isTamil ? 'இடைநிறுத்து' : 'Pause'}</span>
                  </button>
                )}

                <button
                  onClick={() => batchBreakdownManager.cancel()}
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <XCircle size={12} />
                  <span>{isTamil ? 'ரத்து செய்' : 'Cancel'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#334155',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${batchState.percent}%`,
                height: '100%',
                backgroundColor: '#38bdf8',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Top Controller Bar */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Scene Switcher Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handlePrevScene}
            disabled={selectedSceneIndex === 0}
            className="btn-clean"
            style={{ padding: '5px 8px', opacity: selectedSceneIndex === 0 ? 0.3 : 1 }}
          >
            <ChevronLeft size={14} />
          </button>

          <select
            value={selectedSceneIndex}
            onChange={(e) => onSelectSceneIndex(Number(e.target.value))}
            style={{
              backgroundColor: '#ffffff',
              color: '#18181b',
              border: '1px solid #e4e4e7',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              maxWidth: '380px',
            }}
          >
            {scenes.map((s, idx) => {
              const hasItems = s.breakdownItems && s.breakdownItems.length > 0;
              return (
                <option key={s.id} value={idx}>
                  {hasItems ? '✓ ' : '○ '}
                  {isTamil
                    ? `காட்சி ${s.sceneNumber}: ${translateIntExtToTamil(s.intExt)} ${translateLocationToTamil(s.location)} (${s.formattedPages} பக்.)`
                    : `Scene ${s.sceneNumber}: ${s.intExt} ${s.location} (${s.formattedPages} pgs)`}
                </option>
              );
            })}
          </select>

          <button
            onClick={handleNextScene}
            disabled={selectedSceneIndex === scenes.length - 1}
            className="btn-clean"
            style={{ padding: '5px 8px', opacity: selectedSceneIndex === scenes.length - 1 ? 0.3 : 1 }}
          >
            <ChevronRight size={14} />
          </button>

          <span style={{ fontSize: '12px', color: '#71717a', marginLeft: '4px' }}>
            {selectedSceneIndex + 1} / {scenes.length}
          </span>
        </div>

        {/* Action Buttons: Breakdown Single, Breakdown All / Batch Modal, Print */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Breakdown All / Batch Modal Button */}
          <button
            onClick={() => setIsBatchModalOpen(true)}
            disabled={batchState.isRunning}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: batchState.isRunning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
            }}
            title="Breakdown each and every scene in the script automatically"
          >
            <Sparkles size={13} color="#ffffff" />
            <span>
              {isTamil ? `✨ AI அனைத்து காட்சிகளையும் பிரித்தெடு (${scenes.length})` : `✨ AI Breakdown All (${scenes.length} Scenes)`}
            </span>
          </button>

          {/* Breakdown Current Scene */}
          <button
            onClick={handleTriggerAi}
            disabled={isAnalyzing || batchState.isRunning}
            className="btn-clean-dark"
            style={{ padding: '6px 14px' }}
          >
            <Sparkles size={13} color="#f59e0b" />
            <span>{isAnalyzing ? t.analyzingScene : t.aiBreakdownCurrent}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="btn-clean"
            title="Print B&W Breakdown Sheet"
          >
            <Printer size={13} />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Neat Scene Overview Banner */}
      <div
        style={{
          padding: '18px 22px',
          marginBottom: '20px',
          backgroundColor: '#ffffff',
          border: '1px solid #e4e4e7',
          borderRadius: '6px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
              {isTamil ? `காட்சி ${currentScene.sceneNumber} • படப்பிடிப்பு நாள் ${currentScene.shootingDay || 1}` : `Scene ${currentScene.sceneNumber} • Day ${currentScene.shootingDay || 1}`}
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#18181b' }}>
              {displayHeading}
            </h2>
            {displaySynopsis && (
              <p style={{ fontSize: '12.5px', color: '#52525b', marginTop: '4px', lineHeight: '1.5' }}>
                {displaySynopsis}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#71717a' }}>
            <div>
              <span style={{ color: '#a1a1aa', display: 'block', fontSize: '11px' }}>
                {isTamil ? 'பக்க அளவு' : 'Length'}
              </span>
              <strong style={{ color: '#18181b', fontSize: '14px' }}>
                {currentScene.formattedPages} {isTamil ? 'பக்.' : 'pgs'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#a1a1aa', display: 'block', fontSize: '11px' }}>
                {isTamil ? 'திரை நேரம்' : 'Time'}
              </span>
              <strong style={{ color: '#18181b', fontSize: '14px' }}>
                ~{Math.round((currentScene.pagesEighths / 8) * 60)} {isTamil ? 'வினாடிகள்' : 's'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#a1a1aa', display: 'block', fontSize: '11px' }}>
                {isTamil ? 'மொத்த குறிப்புகள்' : 'Elements'}
              </span>
              <strong style={{ color: '#18181b', fontSize: '14px' }}>{totalItems}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Neat 15 Department Breakdown Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
          gap: '12px',
        }}
      >
        {categories.map((catKey) => {
          const meta = CATEGORY_REGISTRY[catKey];
          const items = itemsByCategory(catKey);
          const title = isTamilBreakdown ? meta.nameTa : meta.nameEn;

          return (
            <div
              key={catKey}
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '6px',
                border: '1px solid #e4e4e7',
                backgroundColor: '#ffffff',
                overflow: 'hidden',
                minHeight: '140px',
              }}
            >
              {/* Category Header */}
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e4e4e7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: meta.borderColor,
                    }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#18181b' }}>
                    {title}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#71717a',
                      backgroundColor: '#e2e8f0',
                      padding: '1px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    {items.length}
                  </span>
                </div>

                <button
                  onClick={() => setActiveCategoryModal(catKey)}
                  className="btn-clean"
                  style={{ padding: '2px 6px', fontSize: '11px' }}
                  title={`Add ${title}`}
                >
                  <Plus size={12} />
                  <span>Add</span>
                </button>
              </div>

              {/* Items List */}
              <div style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {items.length === 0 ? (
                  <div style={{ color: '#a1a1aa', fontSize: '11.5px', fontStyle: 'italic', padding: '4px' }}>
                    {isTamil ? 'குறிப்புகள் இல்லை' : 'No items'}
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                          {isTamilBreakdown && item.nameTa ? item.nameTa : item.name}
                          {item.count && item.count > 1 ? ` (x${item.count})` : ''}
                        </div>
                        {(item.description || item.descriptionTa) && (
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                            {isTamilBreakdown && item.descriptionTa ? item.descriptionTa : item.description}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => onDeleteItem(currentScene.id, item.id)}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                        title="Delete Item"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* BATCH BREAKDOWN SELECTION MODAL (CHECK ALL / SELECT)      */}
      {/* ======================================================== */}
      {isBatchModalOpen && (
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
          onClick={() => setIsBatchModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              padding: '24px',
              width: '680px',
              maxWidth: '92vw',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#0284c7" />
                  <span>{isTamil ? 'AI மொத்த காட்சி குறிப்பு பிரித்தெடுத்தல்' : 'AI Batch Screenplay Breakdown'}</span>
                </h3>
                <p style={{ fontSize: '11.5px', color: '#64748b', margin: '3px 0 0 0' }}>
                  {isTamil
                    ? `திரைக்கதையின் அனைத்து காட்சிகளையும் அல்லது தேவையான காட்சிகளை தேர்வு செய்து ஒரே நேரத்தில் Gemini AI மூலம் பிரித்தெடுக்கலாம்.`
                    : `Breakdown all or selected scenes at once with Google Gemini AI in the background.`}
                </p>
              </div>

              <button
                onClick={() => setIsBatchModalOpen(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Quick Action Selection Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                marginBottom: '14px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={toggleSelectAll}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#0f172a',
                  }}
                >
                  {selectedSceneIds.size === scenes.length ? <CheckSquare size={14} color="#0284c7" /> : <Square size={14} />}
                  <span>{selectedSceneIds.size === scenes.length ? (isTamil ? 'அனைத்தையும் நீக்கு' : 'Deselect All') : (isTamil ? 'அனைத்தையும் தேர்வு செய் (All)' : 'Select All Scenes')}</span>
                </button>

                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0284c7' }}>
                  {selectedSceneIds.size} / {scenes.length} {isTamil ? 'தேர்வு செய்யப்பட்டது' : 'Selected'}
                </span>
              </div>

              {/* Filter pills */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setSceneFilter('ALL')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: sceneFilter === 'ALL' ? '#0f172a' : '#e2e8f0',
                    color: sceneFilter === 'ALL' ? '#ffffff' : '#475569',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  All ({scenes.length})
                </button>
                <button
                  onClick={() => setSceneFilter('UNBROKEN')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: sceneFilter === 'UNBROKEN' ? '#0f172a' : '#e2e8f0',
                    color: sceneFilter === 'UNBROKEN' ? '#ffffff' : '#475569',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Unbroken ({unbrokenScenesCount})
                </button>
              </div>
            </div>

            {/* Scrollable Scene Checkbox List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                maxHeight: '380px',
              }}
            >
              {filteredModalScenes.map((s) => {
                const isChecked = selectedSceneIds.has(s.id);
                const hasItems = s.breakdownItems && s.breakdownItems.length > 0;

                return (
                  <div
                    key={s.id}
                    onClick={() => toggleSceneSelection(s.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      backgroundColor: isChecked ? '#f0f9ff' : '#ffffff',
                      border: isChecked ? '1px solid #bae6fd' : '1px solid #f1f5f9',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by parent div
                        style={{ cursor: 'pointer' }}
                      />
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          backgroundColor: '#0f172a',
                          color: '#ffffff',
                          padding: '1px 6px',
                          borderRadius: '3px',
                        }}
                      >
                        SC. {s.sceneNumber}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
                        {s.location} ({s.timeOfDay})
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        color: hasItems ? '#16a34a' : '#94a3b8',
                      }}
                    >
                      {hasItems ? `✓ ${s.breakdownItems.length} items` : '○ Unbroken'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Modal Action Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #e2e8f0',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Estimated speed: ~1.5s per scene with background auto-save
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setIsBatchModalOpen(false)}
                  className="btn-clean"
                  style={{ padding: '6px 14px' }}
                >
                  Cancel
                </button>

                {unbrokenScenesCount > 0 && (
                  <button
                    onClick={handleStartBreakdownUnbroken}
                    style={{
                      backgroundColor: '#334155',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Breakdown {unbrokenScenesCount} Unbroken Scenes
                  </button>
                )}

                <button
                  onClick={handleStartBreakdownSelected}
                  disabled={selectedSceneIds.size === 0}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 16px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: selectedSceneIds.size === 0 ? 'not-allowed' : 'pointer',
                    opacity: selectedSceneIds.size === 0 ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles size={13} />
                  <span>
                    {isTamil
                      ? `தேர்ந்தெடுத்த ${selectedSceneIds.size} காட்சிகளை பிரித்தெடு`
                      : `Breakdown Selected (${selectedSceneIds.size} Scenes)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Item Add Modal */}
      {activeCategoryModal && (
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
          onClick={() => setActiveCategoryModal(null)}
        >
          <form
            onSubmit={handleSaveCustomItem}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '20px',
              width: '400px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
              Add {CATEGORY_REGISTRY[activeCategoryModal].nameEn}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Name / Title
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Revolver, Hero Bike, Stunt Double..."
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '12.5px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Description / Logistical Note (Optional)
                </label>
                <input
                  type="text"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="e.g. Black handle, safety wire required..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '12.5px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setActiveCategoryModal(null)}
                className="btn-clean"
                style={{ padding: '5px 12px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newItemName.trim()}
                className="btn-clean-dark"
                style={{ padding: '5px 16px' }}
              >
                Save Item
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
