import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { ActiveTab } from './NavigationTabs';
import {
  FileText,
  Layers,
  SlidersHorizontal,
  CalendarCheck,
  LayoutGrid,
  Files,
  Archive,
  ClipboardList,
  Sparkles,
  Upload,
  Type,
  KeyRound,
  RotateCcw,
} from 'lucide-react';

interface HeaderProps {
  projectTitle: string;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  sceneCount: number;
  formattedPages: string;
  onOpenImport: () => void;
  onOpenTranscoder: () => void;
  onOpenApiKey: () => void;
  onOpenCopilot: () => void;
  onLoadSample: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  projectTitle,
  activeTab,
  onSelectTab,
  sceneCount,
  formattedPages,
  onOpenImport,
  onOpenTranscoder,
  onOpenApiKey,
  onOpenCopilot,
  onLoadSample,
}) => {
  const { language, toggleLanguage, t, fontFamily, setFontFamily } = useLanguage();

  const navItems: Array<{ id: ActiveTab; label: string; icon: any }> = [
    { id: 'script', label: t.navScript, icon: FileText },
    { id: 'breakdown', label: t.navBreakdown, icon: Layers },
    { id: 'stripboard', label: t.navStripboard, icon: SlidersHorizontal },
    { id: 'dood', label: t.navDood, icon: CalendarCheck },
    { id: 'whiteboard', label: t.navWhiteboard, icon: LayoutGrid },
    { id: 'documents', label: t.navDocuments, icon: Files },
    { id: 'archive', label: t.navArchive, icon: Archive },
    { id: 'callsheet', label: t.navCallSheet, icon: ClipboardList },
  ];

  return (
    <header
      className="no-print"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        height: '52px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--border-light)',
        gap: '16px',
      }}
    >
      {/* Brand & Project Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: '#18181b',
          }}
        >
          {language === 'ta' ? 'திரைக் குறிப்பு' : 'CineBreak'}
        </span>

        <span style={{ color: '#d4d4d8' }}>/</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: '#52525b', fontWeight: 500, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {projectTitle}
          </span>
          <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
            ({sceneCount} sc • {formattedPages} pgs)
          </span>
        </div>
      </div>

      {/* Lean Minimal Navigation Tabs */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: isActive ? '#f4f4f5' : 'transparent',
                color: isActive ? '#18181b' : '#71717a',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 450,
                cursor: 'pointer',
                transition: 'all 0.1s ease',
              }}
            >
              <Icon size={13} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Tools: Clean & Simple */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {/* Import Button */}
        <button
          onClick={onOpenImport}
          className="btn-clean-subtle"
          title={t.importScript}
          style={{ padding: '5px 8px' }}
        >
          <Upload size={13} />
          <span style={{ fontSize: '11.5px' }}>{t.importScript}</span>
        </button>

        {/* Transcoder Button */}
        <button
          onClick={onOpenTranscoder}
          className="btn-clean-subtle"
          title={t.tamilConverter}
          style={{ padding: '5px 8px' }}
        >
          <Type size={13} />
          <span style={{ fontSize: '11.5px' }}>Transcoder</span>
        </button>

        {/* AI Copilot */}
        <button
          onClick={onOpenCopilot}
          className="btn-clean"
          style={{ padding: '5px 10px', fontSize: '11.5px' }}
        >
          <Sparkles size={12} color="#f59e0b" />
          <span>AI Copilot</span>
        </button>

        {/* Sample Switcher */}
        <button
          onClick={onLoadSample}
          className="btn-clean-subtle"
          title={t.resetDefault}
          style={{ padding: '5px 6px' }}
        >
          <RotateCcw size={13} />
        </button>

        {/* Language Pill */}
        <button
          onClick={toggleLanguage}
          className="btn-clean"
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: '#f4f4f5',
            border: '1px solid #e4e4e7',
          }}
          title="Toggle Language / மொழியை மாற்றுக"
        >
          {language === 'en' ? 'தமிழ்' : 'English'}
        </button>

        {/* API Settings */}
        <button
          onClick={onOpenApiKey}
          className="btn-clean-subtle"
          title="Gemini API Key"
          style={{ padding: '5px 6px' }}
        >
          <KeyRound size={13} />
        </button>
      </div>
    </header>
  );
};
