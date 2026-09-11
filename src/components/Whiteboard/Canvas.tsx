import React, { useState } from 'react';
import { WhiteboardCard, CardType } from '../../types/production';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Image as ImageIcon,
  User,
  StickyNote,
  Palette,
  MapPin,
  Music,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface WhiteboardCanvasProps {
  cards: WhiteboardCard[];
  onUpdateCards: (cards: WhiteboardCard[]) => void;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({ cards, onUpdateCards }) => {
  const { t, language } = useLanguage();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeAddType, setActiveAddType] = useState<CardType | null>(null);
  const [cardTitle, setCardTitle] = useState('');
  const [cardContent, setCardContent] = useState('');
  const [cardImageUrl, setCardImageUrl] = useState('');

  // Handle Drag Start
  const handleMouseDown = (e: React.MouseEvent, card: WhiteboardCard) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'INPUT') {
      return;
    }
    setActiveDragId(card.id);
    setDragOffset({
      x: e.clientX - card.x,
      y: e.clientY - card.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!activeDragId) return;
    const newX = Math.max(10, Math.round(e.clientX - dragOffset.x));
    const newY = Math.max(10, Math.round(e.clientY - dragOffset.y));

    onUpdateCards(
      cards.map((c) => (c.id === activeDragId ? { ...c, x: newX, y: newY } : c))
    );
  };

  const handleMouseUp = () => {
    setActiveDragId(null);
  };

  // Add Card
  const handleCreateCard = (type: CardType) => {
    const newCard: WhiteboardCard = {
      id: `wb-${Date.now()}`,
      type,
      x: 100 + (cards.length % 5) * 60,
      y: 100 + (cards.length % 3) * 60,
      width: type === 'palette' ? 260 : 280,
      title: cardTitle.trim() || `New ${type.toUpperCase()}`,
      titleTa: cardTitle.trim() || `புதிய குறிப்பு`,
      content: cardContent.trim() || 'Add notes or reference details here...',
      imageUrl: cardImageUrl.trim() || undefined,
      color:
        type === 'character'
          ? '#e11d48'
          : type === 'palette'
          ? '#d97706'
          : type === 'sticky'
          ? '#ea580c'
          : type === 'location'
          ? '#0284c7'
          : type === 'audio'
          ? '#0d9488'
          : '#7c3aed',
      metadata: {
        hexCodes: type === 'palette' ? ['#0f172a', '#0284c7', '#d97706', '#dc2626'] : undefined,
        tags: [type.toUpperCase()],
      },
    };

    onUpdateCards([...cards, newCard]);
    setActiveAddType(null);
    setCardTitle('');
    setCardContent('');
    setCardImageUrl('');
  };

  const handleDeleteCard = (id: string) => {
    onUpdateCards(cards.filter((c) => c.id !== id));
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 52px)',
        backgroundColor: '#fafafa',
        position: 'relative',
        userSelect: activeDragId ? 'none' : 'auto',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Milanote-style Toolbar Dock */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 24px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e4e4e7',
          zIndex: 10,
        }}
      >
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#18181b' }}>
            {t.whiteboardTitle}
          </h2>
        </div>

        {/* Add Card Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setActiveAddType('character')}
            className="btn-clean"
            style={{ fontSize: '11.5px', padding: '5px 10px' }}
          >
            <User size={12} color="#e11d48" />
            <span>{t.addCardCharacter}</span>
          </button>

          <button
            onClick={() => setActiveAddType('palette')}
            className="btn-clean"
            style={{ fontSize: '11.5px', padding: '5px 10px' }}
          >
            <Palette size={12} color="#d97706" />
            <span>{t.addCardPalette}</span>
          </button>

          <button
            onClick={() => setActiveAddType('sticky')}
            className="btn-clean"
            style={{ fontSize: '11.5px', padding: '5px 10px' }}
          >
            <StickyNote size={12} color="#ea580c" />
            <span>{t.addCardSticky}</span>
          </button>

          <button
            onClick={() => setActiveAddType('location')}
            className="btn-clean"
            style={{ fontSize: '11.5px', padding: '5px 10px' }}
          >
            <MapPin size={12} color="#0284c7" />
            <span>{t.addCardLocation}</span>
          </button>

          <button
            onClick={() => setActiveAddType('audio')}
            className="btn-clean"
            style={{ fontSize: '11.5px', padding: '5px 10px' }}
          >
            <Music size={12} color="#0d9488" />
            <span>{t.addCardAudio}</span>
          </button>

          <button
            onClick={() => setActiveAddType('image')}
            className="btn-clean"
            style={{ fontSize: '11.5px', padding: '5px 10px' }}
          >
            <ImageIcon size={12} color="#7c3aed" />
            <span>{t.addCardImage}</span>
          </button>
        </div>
      </div>

      {/* Interactive Spatial Canvas */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'auto',
          backgroundImage:
            'radial-gradient(#cbd5e1 1.2px, transparent 0)',
          backgroundSize: '24px 24px',
          padding: '40px',
        }}
      >
        {cards.map((card) => {
          const isDragging = activeDragId === card.id;

          return (
            <div
              key={card.id}
              onMouseDown={(e) => handleMouseDown(e, card)}
              style={{
                position: 'absolute',
                left: `${card.x}px`,
                top: `${card.y}px`,
                width: `${card.width || 280}px`,
                backgroundColor: '#ffffff',
                border: `1px solid ${isDragging ? '#0f172a' : '#cbd5e1'}`,
                borderTop: `4px solid ${card.color || '#0f172a'}`,
                borderRadius: '6px',
                padding: '14px',
                boxShadow: isDragging
                  ? '0 15px 30px rgba(0,0,0,0.15)'
                  : '0 2px 8px rgba(0,0,0,0.06)',
                cursor: 'grab',
                zIndex: isDragging ? 100 : 1,
                transition: isDragging ? 'none' : 'box-shadow 0.15s ease',
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#f1f5f9',
                      color: card.color,
                      textTransform: 'uppercase',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {card.type}
                  </span>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                    {language === 'ta' && card.titleTa ? card.titleTa : card.title}
                  </h4>
                </div>

                <button
                  onClick={() => handleDeleteCard(card.id)}
                  title="Remove card"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#e11d48')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Optional Image */}
              {card.imageUrl && (
                <div style={{ marginBottom: '10px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <img
                    src={card.imageUrl}
                    alt={card.title}
                    style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                  />
                </div>
              )}

              {/* Card Body */}
              <p
                style={{
                  fontSize: '12px',
                  color: '#334155',
                  lineHeight: '1.5',
                  marginBottom: '10px',
                }}
              >
                {card.content}
              </p>

              {/* Palette Hex Swatches */}
              {card.type === 'palette' && card.metadata?.hexCodes && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  {card.metadata.hexCodes.map((hex, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                      <div
                        style={{
                          height: '26px',
                          backgroundColor: hex,
                          borderRadius: '3px',
                          border: '1px solid #cbd5e1',
                          marginBottom: '2px',
                        }}
                      />
                      <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>{hex}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tags */}
              {card.metadata?.tags && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                  {card.metadata.tags.map((tag, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '3px',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Card Modal */}
      {activeAddType && (
        <div className="modal-overlay" onClick={() => setActiveAddType(null)}>
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '400px', padding: '24px', backgroundColor: '#ffffff' }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px', color: '#0f172a' }}>
              Add {activeAddType.toUpperCase()} Card
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                {t.cardPromptTitle}
              </label>
              <input
                type="text"
                autoFocus
                value={cardTitle}
                onChange={(e) => setCardTitle(e.target.value)}
                placeholder="e.g. Hero Entry Atmosphere / மதுரை தெருக்கள்"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#0f172a',
                  fontSize: '13px',
                }}
              />
            </div>

            {activeAddType === 'image' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  Image URL
                </label>
                <input
                  type="text"
                  value={cardImageUrl}
                  onChange={(e) => setCardImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#0f172a',
                    fontSize: '13px',
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                {t.cardPromptContent}
              </label>
              <textarea
                rows={3}
                value={cardContent}
                onChange={(e) => setCardContent(e.target.value)}
                placeholder="Reference lighting, costume tone, character motivation, or sound cues..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#0f172a',
                  fontSize: '13px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setActiveAddType(null)} className="btn-secondary">
                {t.cancel}
              </button>
              <button onClick={() => handleCreateCard(activeAddType)} className="btn-primary">
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
