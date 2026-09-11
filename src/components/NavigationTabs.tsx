import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  FileText,
  Layers,
  SlidersHorizontal,
  CalendarCheck,
  LayoutGrid,
  Files,
  Archive,
  ClipboardList,
} from 'lucide-react';

export type ActiveTab =
  | 'script'
  | 'breakdown'
  | 'stripboard'
  | 'dood'
  | 'whiteboard'
  | 'documents'
  | 'archive'
  | 'callsheet';

interface NavigationTabsProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({ activeTab, onSelectTab }) => {
  const { t } = useLanguage();

  const tabs: Array<{ id: ActiveTab; label: string; icon: any; color: string }> = [
    { id: 'script', label: t.navScript, icon: FileText, color: '#0284c7' },
    { id: 'breakdown', label: t.navBreakdown, icon: Layers, color: '#b45309' },
    { id: 'stripboard', label: t.navStripboard, icon: SlidersHorizontal, color: '#7c3aed' },
    { id: 'dood', label: t.navDood, icon: CalendarCheck, color: '#059669' },
    { id: 'whiteboard', label: t.navWhiteboard, icon: LayoutGrid, color: '#db2777' },
    { id: 'documents', label: t.navDocuments, icon: Files, color: '#ea580c' },
    { id: 'archive', label: t.navArchive, icon: Archive, color: '#475569' },
    { id: 'callsheet', label: t.navCallSheet, icon: ClipboardList, color: '#0d9488' },
  ];

  return (
    <nav
      className="no-print"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 24px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 14px',
              borderRadius: '6px',
              border: isActive ? '1px solid #0f172a' : '1px solid transparent',
              backgroundColor: isActive ? '#0f172a' : 'transparent',
              color: isActive ? '#ffffff' : '#475569',
              cursor: 'pointer',
              fontWeight: isActive ? 700 : 500,
              fontSize: '13px',
              transition: 'all 0.12s ease',
            }}
          >
            <Icon size={15} color={isActive ? '#ffffff' : tab.color} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
