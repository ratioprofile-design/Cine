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
  PanelLeftClose,
  PanelLeft,
  Clapperboard,
  Settings,
} from 'lucide-react';

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  projectTitle: string;
  sceneCount: number;
  formattedPages: string;
  onOpenImport: () => void;
  onOpenTranscoder: () => void;
  onOpenApiKey: () => void;
  onOpenCopilot: () => void;
  onLoadSample: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  activeTab,
  onSelectTab,
  projectTitle,
  sceneCount,
  formattedPages,
  onOpenImport,
  onOpenTranscoder,
  onOpenApiKey,
  onOpenCopilot,
  onLoadSample,
}) => {
  const { language, toggleLanguage, t } = useLanguage();

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
    <aside
      className="no-print"
      style={{
        width: isCollapsed ? '64px' : '230px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid var(--border-light)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 50,
      }}
    >
      {/* Top Brand & Togglable Collapse Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          padding: isCollapsed ? '16px 0' : '16px 14px 14px 16px',
          borderBottom: '1px solid var(--border-light)',
          minHeight: '60px',
        }}
      >
        {!isCollapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: '#18181b',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Clapperboard size={14} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <h1
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: '#18181b',
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {language === 'ta' ? 'திரைக் குறிப்பு' : 'CineBreak'}
              </h1>
              <div
                style={{
                  fontSize: '11px',
                  color: '#71717a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={projectTitle}
              >
                {projectTitle}
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: '#18181b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={language === 'ta' ? 'திரைக் குறிப்பு' : 'CineBreak'}
          >
            <Clapperboard size={15} />
          </div>
        )}

        {/* Togglable Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="btn-clean-subtle"
          style={{
            padding: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#71717a',
            marginTop: isCollapsed ? '10px' : '0',
          }}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Project Status Summary (When Expanded) */}
      {!isCollapsed && (
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: '#fafafa',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#71717a',
          }}
        >
          <span>{sceneCount} Scenes</span>
          <span>•</span>
          <span>{formattedPages} Pages</span>
        </div>
      )}

      {/* Main Navigation Headings on the Left */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: isCollapsed ? '12px 6px' : '12px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
        }}
      >
        {!isCollapsed && (
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#a1a1aa',
              padding: '6px 8px 4px 8px',
            }}
          >
            Modules
          </div>
        )}

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isCollapsed ? '0' : '10px',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: isCollapsed ? '10px 0' : '8px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isActive ? '#f4f4f5' : 'transparent',
                color: isActive ? '#18181b' : '#52525b',
                fontWeight: isActive ? 600 : 450,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.1s ease',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
              {!isCollapsed && (
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </span>
              )}
            </button>
          );
        })}

        {/* Tools Section */}
        <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
          {!isCollapsed && (
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#a1a1aa',
                padding: '0 8px 6px 8px',
              }}
            >
              Tools & AI
            </div>
          )}

          {/* Import Script */}
          <button
            onClick={onOpenImport}
            title={t.importScript}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isCollapsed ? '0' : '10px',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              padding: isCollapsed ? '9px 0' : '7px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#52525b',
              fontSize: '12px',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <Upload size={15} style={{ flexShrink: 0 }} />
            {!isCollapsed && <span>{t.importScript}</span>}
          </button>

          {/* Tamil Transcoder */}
          <button
            onClick={onOpenTranscoder}
            title={t.tamilConverter}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isCollapsed ? '0' : '10px',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              padding: isCollapsed ? '9px 0' : '7px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#52525b',
              fontSize: '12px',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <Type size={15} style={{ flexShrink: 0 }} />
            {!isCollapsed && <span>Tamil Transcoder</span>}
          </button>

          {/* AI Copilot */}
          <button
            onClick={onOpenCopilot}
            title="AI Production Copilot"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isCollapsed ? '0' : '10px',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              padding: isCollapsed ? '9px 0' : '7px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#18181b',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <Sparkles size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
            {!isCollapsed && <span>AI Copilot</span>}
          </button>

          {/* Reset / Sample Script */}
          <button
            onClick={onLoadSample}
            title={t.resetDefault}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isCollapsed ? '0' : '10px',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              padding: isCollapsed ? '9px 0' : '7px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#71717a',
              fontSize: '12px',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <RotateCcw size={14} style={{ flexShrink: 0 }} />
            {!isCollapsed && <span>Sample Script</span>}
          </button>
        </div>
      </div>

      {/* Bottom Footer: Language & Settings */}
      <div
        style={{
          padding: isCollapsed ? '10px 6px' : '12px 14px',
          borderTop: '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: isCollapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          backgroundColor: '#ffffff',
        }}
      >
        <button
          onClick={toggleLanguage}
          className="btn-clean"
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 600,
            flex: isCollapsed ? 'none' : 1,
            justifyContent: 'center',
          }}
          title="Toggle Language / மொழியை மாற்றுக"
        >
          {language === 'en' ? 'தமிழ்' : 'English'}
        </button>

        <button
          onClick={onOpenApiKey}
          className="btn-clean-subtle"
          title={language === 'ta' ? 'அமைப்புகள் & AI கட்டமைப்பு' : 'Studio Settings & AI Configuration'}
          style={{ padding: '6px' }}
        >
          <Settings size={14} />
        </button>
      </div>
    </aside>
  );
};
