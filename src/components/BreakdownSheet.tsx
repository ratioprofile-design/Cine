import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  translateToTamil,
  translateDescriptionToTamil,
  translateIntExtToTamil,
  translateTimeOfDayToTamil,
  translateLocationToTamil,
} from '../services/tamilTranslator';

interface BreakdownSheetProps {
  scenes: Scene[];
  selectedSceneIndex: number;
  onSelectSceneIndex: (idx: number) => void;
  onRunAiBreakdown: (scene: Scene) => void;
  onAddItem: (sceneId: string, item: BreakdownItem) => void;
  onDeleteItem: (sceneId: string, itemId: string) => void;
  isAnalyzing: boolean;
}

export const BreakdownSheet: React.FC<BreakdownSheetProps> = ({
  scenes,
  selectedSceneIndex,
  onSelectSceneIndex,
  onRunAiBreakdown,
  onAddItem,
  onDeleteItem,
  isAnalyzing,
}) => {
  const { t, language, effectiveBreakdownLang } = useLanguage();
  const isTamilBreakdown = effectiveBreakdownLang === 'ta';
  const [activeCategoryModal, setActiveCategoryModal] = useState<BreakdownCategory | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  const currentScene = scenes[selectedSceneIndex] || scenes[0];

  if (!currentScene) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#a1a1aa', fontSize: '13px' }}>
        {language === 'ta' ? 'காட்சிகள் எதுவும் கிடைக்கவில்லை.' : 'No scenes available.'}
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
      colors: ['#18181b', '#71717a'],
    });
  };

  const handleSaveCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !activeCategoryModal) return;

    const newItem: BreakdownItem = {
      id: `item-${Date.now()}`,
      category: activeCategoryModal,
      name: newItemName.trim(),
      nameTa: language === 'ta' ? newItemName.trim() : translateToTamil(newItemName.trim()),
      description: newItemDesc.trim() || undefined,
      descriptionTa: language === 'ta' ? newItemDesc.trim() : (newItemDesc.trim() ? translateDescriptionToTamil(newItemDesc.trim()) : undefined),
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
    return currentScene.breakdownItems.filter((i) => i.category === category);
  };

  const totalItems = currentScene.breakdownItems.length;

  const displayHeading = isTamilBreakdown
    ? `காட்சி ${currentScene.sceneNumber}: ${translateIntExtToTamil(currentScene.intExt)} ${translateLocationToTamil(currentScene.location)} - ${translateTimeOfDayToTamil(currentScene.timeOfDay)}`
    : currentScene.rawHeading;

  const displaySynopsis = isTamilBreakdown
    ? (currentScene.synopsisTa || translateToTamil(currentScene.synopsis))
    : currentScene.synopsis;

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#fafafa', minHeight: '100vh' }}>
      {/* Top Controller Bar - Lean & Simple */}
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
            {scenes.map((s, idx) => (
              <option key={s.id} value={idx}>
                {language === 'ta'
                  ? `காட்சி ${s.sceneNumber}: ${translateIntExtToTamil(s.intExt)} ${translateLocationToTamil(s.location)} (${s.formattedPages} பக்.)`
                  : `Scene ${s.sceneNumber}: ${s.intExt} ${s.location} (${s.formattedPages} pgs)`}
              </option>
            ))}
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

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleTriggerAi}
            disabled={isAnalyzing}
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
              {language === 'ta' ? `காட்சி ${currentScene.sceneNumber} • படப்பிடிப்பு நாள் ${currentScene.shootingDay || 1}` : `Scene ${currentScene.sceneNumber} • Day ${currentScene.shootingDay || 1}`}
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
                {language === 'ta' ? 'பக்க அளவு' : 'Length'}
              </span>
              <strong style={{ color: '#18181b', fontSize: '14px' }}>
                {currentScene.formattedPages} {language === 'ta' ? 'பக்.' : 'pgs'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#a1a1aa', display: 'block', fontSize: '11px' }}>
                {language === 'ta' ? 'திரை நேரம்' : 'Time'}
              </span>
              <strong style={{ color: '#18181b', fontSize: '14px' }}>
                ~{Math.round((currentScene.pagesEighths / 8) * 60)} {language === 'ta' ? 'வினாடிகள்' : 's'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#a1a1aa', display: 'block', fontSize: '11px' }}>
                {language === 'ta' ? 'மொத்த குறிப்புகள்' : 'Elements'}
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
              {/* Box Title */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: '#fafafa',
                  borderBottom: '1px solid #f4f4f5',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '12px', color: '#18181b' }}>
                    {title}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      color: items.length > 0 ? '#18181b' : '#a1a1aa',
                      fontWeight: 600,
                    }}
                  >
                    {items.length}
                  </span>
                  <button
                    onClick={() => setActiveCategoryModal(catKey)}
                    title={t.addNewItem}
                    className="no-print"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#71717a',
                      cursor: 'pointer',
                      display: 'flex',
                      padding: '2px',
                    }}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div style={{ padding: '8px 10px', flex: 1, overflowY: 'auto' }}>
                {items.length === 0 ? (
                  <div style={{ color: '#d4d4d8', fontSize: '11.5px', padding: '6px 0' }}>
                    —
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {items.map((item) => {
                      const itemName = isTamilBreakdown
                        ? (item.nameTa || translateToTamil(item.name))
                        : item.name;
                      const itemDesc = isTamilBreakdown
                        ? (item.descriptionTa || translateDescriptionToTamil(item.description))
                        : item.description;

                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '5px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#fbfbfb',
                            border: '1px solid #f0f0f2',
                            fontSize: '12px',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, color: '#18181b' }}>
                              {itemName}
                            </span>
                            {itemDesc && (
                              <span style={{ fontSize: '11px', color: '#71717a', marginLeft: '6px' }}>
                                ({itemDesc})
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => onDeleteItem(currentScene.id, item.id)}
                            title={t.deleteItemTooltip}
                            className="no-print"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#a1a1aa',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#a1a1aa')}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Custom Item Modal */}
      {activeCategoryModal && (
        <div className="modal-overlay" onClick={() => setActiveCategoryModal(null)}>
          <div
            className="clean-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '380px',
              padding: '20px',
              backgroundColor: '#ffffff',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px', color: '#18181b' }}>
              {language === 'ta' ? 'புதிய குறிப்பைச் சேர்: ' : 'Add '}
              {language === 'ta' ? CATEGORY_REGISTRY[activeCategoryModal].nameTa : CATEGORY_REGISTRY[activeCategoryModal].nameEn}
            </h3>

            <form onSubmit={handleSaveCustomItem}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#71717a', marginBottom: '4px' }}>
                  {language === 'ta' ? 'பொருளின் பெயர் / விவரம்' : 'Item Name'}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={language === 'ta' ? 'எ.கா. பொலிரோ கார், வெட்டருவாள்...' : 'e.g. Hero car, flashlight, knife...'}
                  style={{
                    width: '100%',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e4e4e7',
                    padding: '7px 10px',
                    borderRadius: '5px',
                    color: '#18181b',
                    fontSize: '12.5px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#71717a', marginBottom: '4px' }}>
                  {language === 'ta' ? 'கூடுதல் குறிப்புகள் (விருப்பத்தேர்வு)' : 'Notes (Optional)'}
                </label>
                <input
                  type="text"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder={language === 'ta' ? 'அளவு, வண்ணம் அல்லது பாதுகாப்பு குறிப்பு...' : 'Notes, quantities or details...'}
                  style={{
                    width: '100%',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e4e4e7',
                    padding: '7px 10px',
                    borderRadius: '5px',
                    color: '#18181b',
                    fontSize: '12.5px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActiveCategoryModal(null)}
                  className="btn-clean"
                >
                  {t.cancel}
                </button>
                <button type="submit" className="btn-clean-dark">
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
