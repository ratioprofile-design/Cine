import React from 'react';
import { Scene } from '../types/production';
import { useLanguage } from '../i18n/LanguageContext';
import { translateToTamil } from '../services/tamilTranslator';
import { Printer } from 'lucide-react';

interface DoodMatrixProps {
  scenes: Scene[];
}

export const DoodMatrix: React.FC<DoodMatrixProps> = ({ scenes }) => {
  const { t, language } = useLanguage();

  // Find all shooting days
  const shootingDaysSet = new Set<number>();
  scenes.forEach((s, idx) => {
    shootingDaysSet.add(s.shootingDay || Math.ceil((idx + 1) / 3));
  });
  const shootingDays = Array.from(shootingDaysSet).sort((a, b) => a - b);

  // Map unique cast members and the scenes/days they appear in
  const castMap = new Map<string, { character: string; days: Set<number> }>();

  scenes.forEach((s, idx) => {
    const day = s.shootingDay || Math.ceil((idx + 1) / 3);
    s.breakdownItems
      .filter((i) => i.category === 'CAST')
      .forEach((item) => {
        const name = item.name.trim();
        if (!castMap.has(name)) {
          castMap.set(name, { character: name, days: new Set() });
        }
        castMap.get(name)!.days.add(day);
      });
  });

  const castList = Array.from(castMap.values());

  // Determine DOOD code: SW, W, H, WF, SWF
  const getDoodCode = (day: number, activeDays: Set<number>, minDay: number, maxDay: number) => {
    if (minDay === maxDay && day === minDay) {
      return { code: 'SWF', color: '#9a3412', bg: '#ffedd5', printBg: '#cbd5e1' }; // Start-Work-Finish
    }
    if (day === minDay) {
      return { code: 'SW', color: '#166534', bg: '#dcfce7', printBg: '#e2e8f0' }; // Start Work
    }
    if (day === maxDay) {
      return { code: 'WF', color: '#991b1b', bg: '#fee2e2', printBg: '#cbd5e1' }; // Work Finish
    }
    if (activeDays.has(day)) {
      return { code: 'W', color: '#1e40af', bg: '#dbeafe', printBg: '#e2e8f0' }; // Work
    }
    if (day > minDay && day < maxDay) {
      return { code: 'H', color: '#6b21a8', bg: '#f3e8ff', printBg: '#ffffff' }; // Hold
    }
    return { code: '-', color: '#94a3b8', bg: 'transparent', printBg: 'transparent' };
  };

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#fafafa', minHeight: 'calc(100vh - 52px)' }}>
      {/* Header */}
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
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#18181b', marginBottom: '2px' }}>
            {t.doodTitle}
          </h2>
          <p style={{ fontSize: '12px', color: '#71717a' }}>{t.doodSub}</p>
        </div>

        {/* Legend pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10.5px', color: '#166534', fontWeight: 600, backgroundColor: '#dcfce7', padding: '2px 5px', borderRadius: '3px' }}>{t.legendSW}</span>
          <span style={{ fontSize: '10.5px', color: '#1e40af', fontWeight: 600, backgroundColor: '#dbeafe', padding: '2px 5px', borderRadius: '3px' }}>{t.legendW}</span>
          <span style={{ fontSize: '10.5px', color: '#6b21a8', fontWeight: 600, backgroundColor: '#f3e8ff', padding: '2px 5px', borderRadius: '3px' }}>{t.legendH}</span>
          <span style={{ fontSize: '10.5px', color: '#991b1b', fontWeight: 600, backgroundColor: '#fee2e2', padding: '2px 5px', borderRadius: '3px' }}>{t.legendWF}</span>
          <span style={{ fontSize: '10.5px', color: '#9a3412', fontWeight: 600, backgroundColor: '#ffedd5', padding: '2px 5px', borderRadius: '3px' }}>{t.legendSWF}</span>

          <button
            onClick={() => window.print()}
            className="btn-clean"
            style={{ marginLeft: '6px' }}
          >
            <Printer size={13} />
            <span>Print DOOD</span>
          </button>
        </div>
      </div>

      {/* Print Document Title Banner */}
      <div className="print-only" style={{ display: 'none', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '16pt', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>
          CAST DAY-OUT-OF-DAYS (DOOD) REPORT
        </h2>
        <div style={{ fontSize: '9pt', fontWeight: 700, color: '#000000' }}>
          TOTAL CAST: {castList.length} • SHOOTING DAYS: {shootingDays.length}
        </div>
      </div>

      {/* DOOD Table (Sharp Edges Grid) */}
      <div
        style={{
          overflowX: 'auto',
          backgroundColor: '#ffffff',
          borderRadius: '4px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <table className="sharp-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: '40px' }}>#</th>
              <th style={{ textAlign: 'left' }}>{t.charName}</th>
              {shootingDays.map((day) => (
                <th
                  key={day}
                  style={{
                    textAlign: 'center',
                    minWidth: '55px',
                  }}
                >
                  {language === 'ta' ? `நாள் ${day}` : `DAY ${day}`}
                </th>
              ))}
              <th style={{ textAlign: 'center', width: '130px' }}>
                {t.totalWorkDays}
              </th>
            </tr>
          </thead>
          <tbody>
            {castList.length === 0 ? (
              <tr>
                <td colSpan={shootingDays.length + 3} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  {language === 'ta' ? 'நடிகர்கள் விவரங்கள் இன்னும் சேர்க்கப்படவில்லை.' : 'No cast members identified yet. Run AI Breakdown on scenes to populate the DOOD matrix.'}
                </td>
              </tr>
            ) : (
              castList.map((c, idx) => {
                const daysArray = Array.from(c.days);
                const minDay = Math.min(...daysArray);
                const maxDay = Math.max(...daysArray);
                const totalWorkDays = daysArray.length;
                const displayName = language === 'ta' ? translateToTamil(c.character) : c.character;

                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 800, color: '#000000' }}>
                      {displayName}
                    </td>
                    {shootingDays.map((day) => {
                      const item = getDoodCode(day, c.days, minDay, maxDay);
                      return (
                        <td
                          key={day}
                          style={{
                            textAlign: 'center',
                            padding: '6px',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '2px',
                              fontWeight: 900,
                              fontSize: '11px',
                              border: item.code !== '-' ? '1px solid #000000' : 'none',
                              backgroundColor: item.bg,
                              color: item.color,
                            }}
                          >
                            {item.code}
                          </span>
                        </td>
                      );
                    })}
                    <td
                      style={{
                        textAlign: 'center',
                        fontWeight: 900,
                        color: '#000000',
                      }}
                    >
                      {totalWorkDays} Days
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
