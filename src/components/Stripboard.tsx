import React from 'react';
import { Scene } from '../types/production';
import { useLanguage } from '../i18n/LanguageContext';
import { formatEighths } from '../services/scriptParser';
import {
  Calendar,
  MoveUp,
  MoveDown,
  Printer,
} from 'lucide-react';
import {
  translateToTamil,
  translateLocationToTamil,
  translateIntExtToTamil,
  translateTimeOfDayToTamil,
} from '../services/tamilTranslator';

interface StripboardProps {
  scenes: Scene[];
  onReorderScenes: (newScenes: Scene[]) => void;
  onNavigateToScene: (sceneId: string) => void;
}

export const Stripboard: React.FC<StripboardProps> = ({
  scenes,
  onReorderScenes,
  onNavigateToScene,
}) => {
  const { t, language } = useLanguage();

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scenes.length) return;

    const copy = [...scenes];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    onReorderScenes(copy);
  };

  // Helper for light theme strip color scheme
  const getStripColors = (scene: Scene) => {
    const isNight =
      scene.timeOfDay.toUpperCase().includes('NIGHT') ||
      scene.timeOfDay.includes('இரவு');
    const isExt =
      scene.intExt.toUpperCase().includes('EXT') ||
      scene.intExt.includes('வெளி');

    if (isExt && !isNight) {
      // EXT. DAY: Warm Soft Yellow
      return {
        bg: '#fef9c3',
        text: '#854d0e',
        border: '#fde047',
        tag: language === 'ta' ? 'வெளி. பகல்' : 'EXT. DAY',
      };
    }
    if (!isExt && !isNight) {
      // INT. DAY: Crisp Ivory White
      return {
        bg: '#ffffff',
        text: '#0f172a',
        border: '#cbd5e1',
        tag: language === 'ta' ? 'உள். பகல்' : 'INT. DAY',
      };
    }
    if (!isExt && isNight) {
      // INT. NIGHT: Cool Light Blue
      return {
        bg: '#f0f9ff',
        text: '#0369a1',
        border: '#bae6fd',
        tag: language === 'ta' ? 'உள். இரவு' : 'INT. NIGHT',
      };
    }
    // EXT. NIGHT: Soft Indigo
    return {
      bg: '#eef2ff',
      text: '#4338ca',
      border: '#c7d2fe',
      tag: language === 'ta' ? 'வெளி. இரவு' : 'EXT. NIGHT',
    };
  };

  // Group scenes by shooting day
  const groupedDays = scenes.reduce<Record<number, Scene[]>>((acc, s, idx) => {
    const day = s.shootingDay || Math.ceil((idx + 1) / 3);
    if (!acc[day]) acc[day] = [];
    acc[day].push(s);
    return acc;
  }, {});

  const dayNumbers = Object.keys(groupedDays).map(Number).sort((a, b) => a - b);
  let runningCumulativeEighths = 0;

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#fafafa', minHeight: 'calc(100vh - 52px)' }}>
      {/* Header & Legend */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#18181b', marginBottom: '2px' }}>
            {t.stripboardTitle}
          </h2>
          <p style={{ fontSize: '12px', color: '#71717a' }}>{t.stripboardSub}</p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ padding: '2px 6px', borderRadius: '3px', backgroundColor: '#ffffff', color: '#18181b', border: '1px solid #e4e4e7', fontSize: '10.5px', fontWeight: 600 }}>
            {t.intDay}
          </span>
          <span style={{ padding: '2px 6px', borderRadius: '3px', backgroundColor: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', fontSize: '10.5px', fontWeight: 600 }}>
            {t.extDay}
          </span>
          <span style={{ padding: '2px 6px', borderRadius: '3px', backgroundColor: '#e0f2fe', color: '#075985', border: '1px solid #7dd3fc', fontSize: '10.5px', fontWeight: 600 }}>
            {t.intNight}
          </span>
          <span style={{ padding: '2px 6px', borderRadius: '3px', backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #a5b4fc', fontSize: '10.5px', fontWeight: 600 }}>
            {t.extNight}
          </span>

          <button
            onClick={() => window.print()}
            className="btn-clean"
            style={{ marginLeft: '6px' }}
          >
            <Printer size={13} />
            <span>Print Schedule</span>
          </button>
        </div>
      </div>

      {/* Stripboard Days & Strips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {dayNumbers.map((dayNum) => {
          const dayScenes = groupedDays[dayNum] || [];
          const dayEighths = dayScenes.reduce((acc, s) => acc + s.pagesEighths, 0);
          runningCumulativeEighths += dayEighths;

          return (
            <div
              key={dayNum}
              style={{
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {/* Day Break Divider */}
              <div
                className="print-day-divider"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 16px',
                  backgroundColor: '#f1f5f9',
                  borderBottom: '2px solid #0f172a',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={15} color="#0f172a" />
                  <span style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>
                    {t.dayHeader} {dayNum}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    ({dayScenes.length} scenes)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
                  <span>
                    {t.dailyPages}:{' '}
                    <strong style={{ color: '#0f172a' }}>{formatEighths(dayEighths)} pgs</strong>
                  </span>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <span>
                    {t.cumulativePages}:{' '}
                    <strong style={{ color: '#0284c7' }}>
                      {formatEighths(runningCumulativeEighths)} pgs
                    </strong>
                  </span>
                </div>
              </div>

              {/* Strips List */}
              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {dayScenes.map((scene) => {
                  const globalIndex = scenes.indexOf(scene);
                  const colors = getStripColors(scene);
                  const castList = scene.breakdownItems
                    .filter((i) => i.category === 'CAST')
                    .map((c) => (language === 'ta' ? (c.nameTa || translateToTamil(c.name)) : c.name))
                    .slice(0, 4)
                    .join(', ');

                  const displayLoc = language === 'ta' ? translateLocationToTamil(scene.location) : scene.location;
                  const displaySyn = language === 'ta'
                    ? (scene.synopsisTa || translateToTamil(scene.synopsis))
                    : (scene.synopsis || scene.rawHeading);

                  return (
                    <div
                      key={scene.id}
                      className="print-strip"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '45px 75px 95px 1fr 180px 75px 65px',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        borderRadius: '4px',
                        backgroundColor: colors.bg,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                        fontSize: '12px',
                      }}
                    >
                      {/* Order / Move */}
                      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <button
                          onClick={() => handleMove(globalIndex, 'up')}
                          disabled={globalIndex === 0}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: colors.text,
                            cursor: 'pointer',
                            opacity: globalIndex === 0 ? 0.2 : 0.7,
                            padding: '1px',
                          }}
                        >
                          <MoveUp size={13} />
                        </button>
                        <button
                          onClick={() => handleMove(globalIndex, 'down')}
                          disabled={globalIndex === scenes.length - 1}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: colors.text,
                            cursor: 'pointer',
                            opacity: globalIndex === scenes.length - 1 ? 0.2 : 0.7,
                            padding: '1px',
                          }}
                        >
                          <MoveDown size={13} />
                        </button>
                      </div>

                      {/* Scene Number */}
                      <div
                        onClick={() => onNavigateToScene(scene.id)}
                        style={{
                          fontWeight: 800,
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          color: colors.text,
                        }}
                      >
                        {language === 'ta' ? `காட்சி ${scene.sceneNumber}` : `SC. ${scene.sceneNumber}`}
                      </div>

                      {/* Tag */}
                      <div style={{ fontWeight: 800, fontSize: '10.5px', textTransform: 'uppercase' }}>
                        {colors.tag}
                      </div>

                      {/* Location & Synopsis */}
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <strong style={{ marginRight: '6px' }}>{displayLoc}</strong>
                        <span style={{ opacity: 0.85, fontSize: '11px' }}>
                          - {displaySyn}
                        </span>
                      </div>

                      {/* Cast */}
                      <div
                        style={{
                          fontSize: '11px',
                          opacity: 0.9,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={castList || 'No cast identified'}
                      >
                        {castList ? (language === 'ta' ? `நடிகர்கள்: ${castList}` : `Cast: ${castList}`) : '—'}
                      </div>

                      {/* Page Count */}
                      <div style={{ fontWeight: 800, textAlign: 'right' }}>
                        {scene.formattedPages} {language === 'ta' ? 'பக்.' : 'pgs'}
                      </div>

                      {/* Shooting Day Tag */}
                      <div style={{ textAlign: 'center', fontSize: '10.5px', opacity: 0.8 }}>
                        {language === 'ta' ? `நாள் ${dayNum}` : `Day ${dayNum}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
