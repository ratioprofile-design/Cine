import React from 'react';
import { Scene, ScriptVersion } from '../types/production';
import { useLanguage } from '../i18n/LanguageContext';
import { formatEighths } from '../services/scriptParser';
import { Clapperboard, FileText, Users, Package, Flame, SunMedium, Building } from 'lucide-react';

interface StatsBarProps {
  scenes: Scene[];
  activeVersion: ScriptVersion;
}

export const StatsBar: React.FC<StatsBarProps> = ({ scenes, activeVersion }) => {
  const { t, language } = useLanguage();

  const totalScenes = scenes.length;
  const totalEighths = scenes.reduce((acc, s) => acc + s.pagesEighths, 0);
  const formattedPages = formatEighths(totalEighths);

  // Collect unique cast
  const castSet = new Set<string>();
  let propCount = 0;
  let stuntCount = 0;
  let dayCount = 0;
  let nightCount = 0;
  let intCount = 0;
  let extCount = 0;

  scenes.forEach((s) => {
    s.breakdownItems.forEach((item) => {
      if (item.category === 'CAST') castSet.add(item.name.toLowerCase());
      if (item.category === 'PROPS') propCount += (item.count || 1);
      if (item.category === 'STUNTS') stuntCount += (item.count || 1);
    });

    const isNight = s.timeOfDay.toUpperCase().includes('NIGHT') || s.timeOfDay.includes('இரவு');
    if (isNight) nightCount++;
    else dayCount++;

    const isExt = s.intExt.toUpperCase().includes('EXT') || s.intExt.includes('வெளி');
    if (isExt) extCount++;
    else intCount++;
  });

  const getRevisionColorBadge = (color: string) => {
    switch (color) {
      case 'WHITE': return { bg: '#ffffff', text: '#0f172a', border: '#cbd5e1' };
      case 'BLUE': return { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' };
      case 'PINK': return { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' };
      case 'YELLOW': return { bg: '#fef9c3', text: '#854d0e', border: '#fde047' };
      case 'GREEN': return { bg: '#dcfce7', text: '#166534', border: '#86efac' };
      default: return { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' };
    }
  };

  const badgeStyle = getRevisionColorBadge(activeVersion.revisionColor);

  return (
    <div
      className="no-print"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '8px 24px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        fontSize: '12px',
        color: '#475569',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        {/* Revision Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#64748b' }}>{t.currentVersion}:</span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: badgeStyle.bg,
              color: badgeStyle.text,
              border: `1px solid ${badgeStyle.border}`,
            }}
          >
            {language === 'ta' ? activeVersion.versionNameTa : activeVersion.versionName}
          </span>
        </div>

        {/* Total Scenes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clapperboard size={14} color="#b45309" />
          <span style={{ color: '#64748b' }}>{t.totalScenes}:</span>
          <strong style={{ color: '#0f172a' }}>{totalScenes}</strong>
        </div>

        {/* Total Pages */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileText size={14} color="#0284c7" />
          <span style={{ color: '#64748b' }}>{t.totalPages}:</span>
          <strong style={{ color: '#0284c7' }}>{formattedPages} pgs</strong>
        </div>

        {/* Speaking Cast */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={14} color="#e11d48" />
          <span style={{ color: '#64748b' }}>{t.castCount}:</span>
          <strong style={{ color: '#e11d48' }}>{castSet.size}</strong>
        </div>

        {/* Props */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Package size={14} color="#7c3aed" />
          <span style={{ color: '#64748b' }}>{t.totalProps}:</span>
          <strong style={{ color: '#7c3aed' }}>{propCount}</strong>
        </div>

        {/* Stunts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Flame size={14} color="#ea580c" />
          <span style={{ color: '#64748b' }}>{t.stuntCount}:</span>
          <strong style={{ color: '#ea580c' }}>{stuntCount}</strong>
        </div>
      </div>

      {/* Ratios */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#64748b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <SunMedium size={14} color="#d97706" />
          <span>
            {dayCount}D / {nightCount}N
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Building size={14} color="#0284c7" />
          <span>
            {intCount} INT / {extCount} EXT
          </span>
        </div>
      </div>
    </div>
  );
};
