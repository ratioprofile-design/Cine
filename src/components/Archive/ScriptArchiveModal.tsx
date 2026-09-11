import React, { useState } from 'react';
import { ScriptVersion, RevisionColor } from '../../types/production';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatEighths } from '../../services/scriptParser';
import {
  Archive,
  Plus,
  Lock,
  Unlock,
  Copy,
  Trash2,
  CheckCircle2,
  Calendar,
  FileText,
  User,
} from 'lucide-react';

interface ScriptArchiveProps {
  versions: ScriptVersion[];
  activeVersionId: string;
  onSelectVersion: (id: string) => void;
  onCreateNewVersion: (
    name: string,
    color: RevisionColor,
    status: 'DRAFT' | 'REVISED' | 'LOCKED' | 'SHOOTING'
  ) => void;
  onToggleLock: (id: string) => void;
  onDuplicateVersion: (id: string) => void;
  onDeleteVersion: (id: string) => void;
}

export const ScriptArchiveView: React.FC<ScriptArchiveProps> = ({
  versions,
  activeVersionId,
  onSelectVersion,
  onCreateNewVersion,
  onToggleLock,
  onDuplicateVersion,
  onDeleteVersion,
}) => {
  const { t, language } = useLanguage();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDraftName, setNewDraftName] = useState('');
  const [newDraftColor, setNewDraftColor] = useState<RevisionColor>('BLUE');

  const getColorMeta = (color: RevisionColor) => {
    switch (color) {
      case 'WHITE': return { bg: '#ffffff', text: '#0f172a', border: '#cbd5e1' };
      case 'BLUE': return { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' };
      case 'PINK': return { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' };
      case 'YELLOW': return { bg: '#fef9c3', text: '#854d0e', border: '#fde047' };
      case 'GREEN': return { bg: '#dcfce7', text: '#166534', border: '#86efac' };
      default: return { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' };
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDraftName.trim()) return;
    onCreateNewVersion(newDraftName.trim(), newDraftColor, 'REVISED');
    setNewDraftName('');
    setShowCreateModal(false);
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 128px)' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Archive size={18} color="#0f172a" />
            {t.archiveTitle}
          </h2>
          <p style={{ fontSize: '12px', color: '#64748b' }}>{t.archiveSub}</p>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus size={16} />
          <span>{t.createNewDraft}</span>
        </button>
      </div>

      {/* Drafts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {versions.map((ver) => {
          const isActive = ver.id === activeVersionId;
          const colorMeta = getColorMeta(ver.revisionColor);

          return (
            <div
              key={ver.id}
              className="glass-panel"
              style={{
                borderRadius: '6px',
                padding: '18px',
                backgroundColor: '#ffffff',
                border: isActive ? '2px solid #0f172a' : '1px solid #cbd5e1',
                boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {/* Top Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: colorMeta.bg,
                    color: colorMeta.text,
                    border: `1px solid ${colorMeta.border}`,
                  }}
                >
                  {ver.revisionColor} REVISION
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {ver.status === 'LOCKED' ? (
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        color: '#991b1b',
                        backgroundColor: '#fee2e2',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Lock size={11} /> LOCKED
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        color: '#166534',
                        backgroundColor: '#dcfce7',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {ver.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Title */}
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                {language === 'ta' && ver.versionNameTa ? ver.versionNameTa : ver.versionName}
              </h3>

              {/* Metadata */}
              <div
                style={{
                  fontSize: '11.5px',
                  color: '#64748b',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={12} color="#64748b" />
                  <span>{ver.author || 'Production Crew'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={12} color="#64748b" />
                  <span>
                    {ver.sceneCount} scenes • {formatEighths(ver.pageCountEighths)} pages
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={12} color="#64748b" />
                  <span>{new Date(ver.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                {isActive ? (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CheckCircle2 size={14} color="#059669" /> Active Draft
                  </span>
                ) : (
                  <button
                    onClick={() => onSelectVersion(ver.id)}
                    className="btn-secondary"
                    style={{ fontSize: '11.5px', padding: '4px 10px' }}
                  >
                    {t.restoreDraft}
                  </button>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => onToggleLock(ver.id)}
                    title="Lock/Unlock revision"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    {ver.status === 'LOCKED' ? <Unlock size={14} /> : <Lock size={14} />}
                  </button>

                  <button
                    onClick={() => onDuplicateVersion(ver.id)}
                    title={t.duplicateDraft}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    <Copy size={14} />
                  </button>

                  {versions.length > 1 && (
                    <button
                      onClick={() => onDeleteVersion(ver.id)}
                      title="Delete draft"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#e11d48')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Version Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '420px', padding: '24px', backgroundColor: '#ffffff' }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', color: '#0f172a' }}>
              {t.createNewDraft}
            </h3>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  {t.draftName}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newDraftName}
                  onChange={(e) => setNewDraftName(e.target.value)}
                  placeholder="e.g. Shooting Revision 3 - Director Cut / சண்டைக்காட்சி மாற்றம்"
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

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  {t.revisionColor}
                </label>
                <select
                  value={newDraftColor}
                  onChange={(e) => setNewDraftColor(e.target.value as RevisionColor)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#0f172a',
                    fontSize: '13px',
                  }}
                >
                  <option value="WHITE">White (Original Draft)</option>
                  <option value="BLUE">Blue (Revision 1)</option>
                  <option value="PINK">Pink (Revision 2)</option>
                  <option value="YELLOW">Yellow (Revision 3)</option>
                  <option value="GREEN">Green (Revision 4)</option>
                  <option value="GOLDENROD">Goldenrod (Revision 5)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  {t.cancel}
                </button>
                <button type="submit" className="btn-primary">
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
