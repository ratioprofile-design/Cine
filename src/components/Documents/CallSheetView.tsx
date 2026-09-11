import React, { useState } from 'react';
import { CallSheet, Scene, CastCallItem, ExtrasCallItem } from '../../types/production';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatEighths } from '../../services/scriptParser';
import {
  Printer,
  Edit3,
  Check,
  Plus,
  Trash2,
  Sparkles,
  MapPin,
  Sun,
  Shield,
  Clock,
  Coffee,
  AlertTriangle,
  Camera,
  Flame,
  Utensils,
  Calendar,
  Layers,
} from 'lucide-react';

interface CallSheetViewProps {
  callSheet: CallSheet;
  scenes: Scene[];
  onUpdateCallSheet: (sheet: CallSheet) => void;
}

export const CallSheetView: React.FC<CallSheetViewProps> = ({
  callSheet,
  scenes,
  onUpdateCallSheet,
}) => {
  const { language, t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [sheetData, setSheetData] = useState<CallSheet>(callSheet);

  const handleSave = () => {
    onUpdateCallSheet(sheetData);
    setIsEditing(false);
  };

  // Auto-Fill from current project scenes and breakdown data
  const handleAutoFillFromScenes = () => {
    const scheduledSceneObjects = scenes.slice(0, 3);
    const sceneIds = scheduledSceneObjects.map((s) => s.id);

    // Extract all unique characters from these scenes
    const charMap = new Map<string, { character: string; nameTa?: string }>();
    scheduledSceneObjects.forEach((s) => {
      s.breakdownItems
        .filter((item) => item.category === 'CAST')
        .forEach((item) => {
          if (!charMap.has(item.name)) {
            charMap.set(item.name, { character: item.name, nameTa: item.nameTa });
          }
        });
    });

    const newCastCalls: CastCallItem[] = Array.from(charMap.entries()).map(([name, meta], idx) => ({
      id: `cc-auto-${idx + 1}`,
      castNumber: idx + 1,
      characterName: meta.nameTa ? `${name} (${meta.nameTa})` : name,
      actorName: idx === 0 ? 'Hero Lead' : idx === 1 ? 'Antagonist Lead' : `Actor ${idx + 1}`,
      status: idx === 0 ? 'SW' : 'W',
      pickupTime: idx === 0 ? '16:00' : '16:30',
      makeupTime: idx === 0 ? '16:30' : '17:00',
      onSetTime: idx === 0 ? '17:45' : '18:00',
      notes: idx === 0 ? 'Principal action scene; wet hair & blood makeup' : 'Standard costume & makeup',
    }));

    const primaryScene = scheduledSceneObjects[0];

    const updated: CallSheet = {
      ...sheetData,
      scheduledScenes: sceneIds,
      locationName: primaryScene ? primaryScene.location : sheetData.locationName,
      castCalls: newCastCalls.length > 0 ? newCastCalls : sheetData.castCalls,
    };

    setSheetData(updated);
    onUpdateCallSheet(updated);
  };

  // Add new Cast Row
  const handleAddCastRow = () => {
    const newCast: CastCallItem = {
      id: `cc-${Date.now()}`,
      castNumber: sheetData.castCalls.length + 1,
      characterName: 'New Character',
      actorName: 'Actor Name',
      status: 'W',
      pickupTime: '17:00',
      makeupTime: '17:30',
      onSetTime: '18:15',
      notes: '',
    };
    setSheetData({
      ...sheetData,
      castCalls: [...sheetData.castCalls, newCast],
    });
  };

  // Remove Cast Row
  const handleRemoveCastRow = (id: string) => {
    setSheetData({
      ...sheetData,
      castCalls: sheetData.castCalls.filter((c) => c.id !== id),
    });
  };

  // Add Extras Row
  const handleAddExtrasRow = () => {
    const newExtra: ExtrasCallItem = {
      id: `ex-${Date.now()}`,
      groupName: 'Devotees / Crowd',
      count: 50,
      callTime: '17:30',
      wardrobeNotes: 'Traditional South Indian festival attire',
    };
    setSheetData({
      ...sheetData,
      extrasCalls: [...(sheetData.extrasCalls || []), newExtra],
    });
  };

  // Remove Extras Row
  const handleRemoveExtrasRow = (id: string) => {
    setSheetData({
      ...sheetData,
      extrasCalls: (sheetData.extrasCalls || []).filter((e) => e.id !== id),
    });
  };

  // Scheduled Scene Objects
  const scheduledScenesList = scenes.filter((s) =>
    (sheetData.scheduledScenes || []).includes(s.id)
  );
  const totalScheduledPagesEighths = scheduledScenesList.reduce((acc, s) => acc + s.pagesEighths, 0);

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#fafafa', minHeight: '100vh' }}>
      {/* Top Action Header Bar */}
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
            {language === 'ta' ? 'தயாரிப்பு அழைப்பு தாள் (Production Call Sheet)' : 'Production Call Sheet & Daily Briefing'}
          </h2>
          <p style={{ fontSize: '12px', color: '#71717a' }}>
            Industry-standard call sheet with sharp black & white export layout and cast/crew scheduling.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Auto-Fill from Scenes Button */}
          <button
            onClick={handleAutoFillFromScenes}
            className="btn-clean"
            style={{ fontSize: '11.5px', padding: '5px 10px' }}
            title="Auto-fill today's scenes and cast from project script"
          >
            <Sparkles size={13} color="#f59e0b" />
            <span>Auto-Fill from Script</span>
          </button>

          {/* Edit / Save Button */}
          <button
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            className={isEditing ? 'btn-clean-dark' : 'btn-clean'}
            style={{ fontSize: '11.5px', padding: '5px 12px' }}
          >
            {isEditing ? <Check size={13} /> : <Edit3 size={13} />}
            <span>{isEditing ? t.save : t.edit}</span>
          </button>

          {/* Print Call Sheet */}
          <button
            onClick={() => window.print()}
            className="btn-clean-dark"
            style={{ fontSize: '11.5px', padding: '5px 12px' }}
          >
            <Printer size={13} />
            <span>Print Call Sheet</span>
          </button>
        </div>
      </div>

      {/* Official Studio Call Sheet Document Container (Sharp Black & White Aesthetic) */}
      <div
        style={{
          maxWidth: '920px',
          margin: '0 auto',
          padding: '36px 40px',
          backgroundColor: '#ffffff',
          color: '#000000',
          border: '2.5px solid #000000',
          borderRadius: '0px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Production Top Block */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2.5px solid #000000',
            paddingBottom: '16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#000000',
              }}
            >
              OFFICIAL PRODUCTION CALL SHEET • திரைக் குறிப்பு
            </div>

            {isEditing ? (
              <input
                type="text"
                value={sheetData.productionTitle}
                onChange={(e) => setSheetData({ ...sheetData, productionTitle: e.target.value })}
                style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  width: '90%',
                  border: '1.5px solid #000000',
                  padding: '4px 6px',
                  marginTop: '4px',
                }}
              />
            ) : (
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: 900,
                  color: '#000000',
                  marginTop: '2px',
                  textTransform: 'uppercase',
                  letterSpacing: '-0.02em',
                }}
              >
                {sheetData.productionTitle}
              </h1>
            )}

            {/* Shoot Day and Date Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px' }}>
              <div style={{ fontSize: '13px', fontWeight: 900, color: '#000000' }}>
                DAY {sheetData.shootDay} OF {sheetData.totalShootDays}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#000000' }}>
                DATE: {sheetData.date}
              </div>
            </div>
          </div>

          {/* Call Times Box (Sharp Pure Black Container) */}
          <div
            style={{
              display: 'flex',
              gap: '2px',
              border: '2px solid #000000',
              backgroundColor: '#000000',
              color: '#ffffff',
              padding: '2px',
            }}
          >
            <div style={{ padding: '8px 18px', textAlign: 'center', borderRight: '1px solid #333333' }}>
              <div style={{ fontSize: '9.5px', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em' }}>
                TIFFIN / BREAKFAST
              </div>
              <div style={{ fontSize: '16px', fontWeight: 900 }}>
                {sheetData.breakfastTime || '16:00'}
              </div>
            </div>

            <div style={{ padding: '8px 20px', textAlign: 'center', backgroundColor: '#000000' }}>
              <div style={{ fontSize: '9.5px', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.08em', color: '#f59e0b' }}>
                CREW CALL
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900 }}>
                {sheetData.generalCrewCall}
              </div>
            </div>

            <div style={{ padding: '8px 18px', textAlign: 'center', borderLeft: '1px solid #333333' }}>
              <div style={{ fontSize: '9.5px', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em' }}>
                ESTIMATED WRAP
              </div>
              <div style={{ fontSize: '16px', fontWeight: 900 }}>
                {sheetData.estimatedWrap || '05:30 AM'}
              </div>
            </div>
          </div>
        </div>

        {/* Key Department Leadership Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            border: '1.5px solid #000000',
            marginBottom: '16px',
            fontSize: '11.5px',
          }}
        >
          <div style={{ padding: '8px 10px', borderRight: '1.5px solid #000000' }}>
            <span style={{ color: '#000000', fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
              {t.directorTitle}:
            </span>
            <strong>{sheetData.director}</strong>
          </div>
          <div style={{ padding: '8px 10px', borderRight: '1.5px solid #000000' }}>
            <span style={{ color: '#000000', fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
              {t.producerTitle}:
            </span>
            <strong>{sheetData.producer}</strong>
          </div>
          <div style={{ padding: '8px 10px', borderRight: '1.5px solid #000000' }}>
            <span style={{ color: '#000000', fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
              {t.firstAdTitle}:
            </span>
            <strong>{sheetData.firstAd}</strong>
          </div>
          <div style={{ padding: '8px 10px' }}>
            <span style={{ color: '#000000', fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
              Cinematographer (DOP):
            </span>
            <strong>{sheetData.cinematographer}</strong>
          </div>

          <div style={{ padding: '8px 10px', borderRight: '1.5px solid #000000', borderTop: '1.5px solid #000000' }}>
            <span style={{ color: '#000000', fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
              Production Designer:
            </span>
            <strong>{sheetData.productionDesigner || 'T. Santhanam'}</strong>
          </div>
          <div style={{ padding: '8px 10px', borderRight: '1.5px solid #000000', borderTop: '1.5px solid #000000' }}>
            <span style={{ color: '#000000', fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
              Stunt Master:
            </span>
            <strong>{sheetData.stuntCoordinator || 'Super Subbarayan Unit'}</strong>
          </div>
          <div style={{ padding: '8px 10px', borderRight: '1.5px solid #000000', borderTop: '1.5px solid #000000' }}>
            <span style={{ color: '#000000', fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
              Sync Sound / Foley:
            </span>
            <strong>{sheetData.soundMixer || 'T. Udayakumar'}</strong>
          </div>
          <div style={{ padding: '8px 10px', borderTop: '1.5px solid #000000' }}>
            <span style={{ color: '#000000', fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
              Set Safety Marshal:
            </span>
            <strong>R. Manikandan (Certified)</strong>
          </div>
        </div>

        {/* Weather & Hospital Emergency Alert Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            border: '1.5px solid #000000',
            marginBottom: '16px',
            fontSize: '11.5px',
          }}
        >
          <div style={{ padding: '10px 14px', borderRight: '1.5px solid #000000' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '3px' }}>
              <Sun size={13} /> Weather Forecast & Solar Info
            </div>
            <div>{sheetData.weather}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>{sheetData.sunriseSunset}</div>
          </div>

          <div style={{ padding: '10px 14px', backgroundColor: '#fcfcfc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '3px', color: '#000000' }}>
              <Shield size={13} /> 24/7 Nearest Trauma Hospital
            </div>
            <div style={{ fontWeight: 800 }}>{sheetData.hospitalName}</div>
            <div style={{ fontSize: '10.5px' }}>{sheetData.hospitalAddress}</div>
            <div style={{ fontSize: '11px', fontWeight: 900, marginTop: '2px' }}>
              EMERGENCY TEL: {sheetData.hospitalEmergencyPhone}
            </div>
          </div>
        </div>

        {/* Shooting Location & Basecamp Instructions */}
        <div
          style={{
            border: '1.5px solid #000000',
            padding: '10px 14px',
            marginBottom: '18px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '3px' }}>
            <MapPin size={13} /> Shooting Location, Basecamp & Parking
          </div>
          <div>
            <strong>{sheetData.locationName}</strong> — {sheetData.locationAddress}
          </div>
          <div style={{ fontSize: '11.5px', fontWeight: 600, marginTop: '3px' }}>
            PARKING & LOGISTICS: {sheetData.parkingInstructions}
          </div>
        </div>

        {/* Scheduled Scenes Table (Sharp Black & White Matrix) */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              padding: '5px 10px',
              fontSize: '11px',
              fontWeight: 900,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>SCHEDULED SCENES FOR THE DAY</span>
            <span>TOTAL PAGES: {formatEighths(totalScheduledPagesEighths)}</span>
          </div>

          <table className="sharp-table">
            <thead>
              <tr>
                <th style={{ width: '65px', textAlign: 'center' }}>SCENE #</th>
                <th style={{ width: '60px', textAlign: 'center' }}>D/N</th>
                <th style={{ textAlign: 'left' }}>SET / LOCATION</th>
                <th style={{ textAlign: 'left' }}>DESCRIPTION</th>
                <th style={{ width: '70px', textAlign: 'center' }}>CAST IDS</th>
                <th style={{ width: '65px', textAlign: 'center' }}>PAGES</th>
              </tr>
            </thead>
            <tbody>
              {scheduledScenesList.map((s) => (
                <tr key={s.id}>
                  <td style={{ textAlign: 'center', fontWeight: 900 }}>{s.sceneNumber}</td>
                  <td style={{ textAlign: 'center', fontWeight: 800 }}>{s.timeOfDay}</td>
                  <td style={{ fontWeight: 800 }}>
                    {s.intExt}. {s.location}
                  </td>
                  <td>{s.synopsis}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                    {s.breakdownItems
                      .filter((i) => i.category === 'CAST')
                      .map((_, idx) => idx + 1)
                      .join(', ') || '1, 2'}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 900 }}>
                    {s.formattedPages}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cast Call Schedule Table (Sharp Edged Table) */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              padding: '5px 10px',
              fontSize: '11px',
              fontWeight: 900,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>CAST CALL TIMES & ARTIST SCHEDULE</span>
            {isEditing && (
              <button
                onClick={handleAddCastRow}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  cursor: 'pointer',
                }}
              >
                + Add Cast Row
              </button>
            )}
          </div>

          <table className="sharp-table">
            <thead>
              <tr>
                <th style={{ width: '55px', textAlign: 'center' }}>CAST #</th>
                <th style={{ textAlign: 'left' }}>CHARACTER</th>
                <th style={{ textAlign: 'left' }}>ACTOR</th>
                <th style={{ width: '55px', textAlign: 'center' }}>STATUS</th>
                <th style={{ width: '65px', textAlign: 'center' }}>PICKUP</th>
                <th style={{ width: '65px', textAlign: 'center' }}>H/MU</th>
                <th style={{ width: '65px', textAlign: 'center' }}>ON SET</th>
                <th style={{ textAlign: 'left' }}>SPECIAL NOTES & INSTRUCTIONS</th>
                {isEditing && <th style={{ width: '40px', textAlign: 'center' }}>DEL</th>}
              </tr>
            </thead>
            <tbody>
              {sheetData.castCalls.map((cc) => (
                <tr key={cc.id}>
                  <td style={{ textAlign: 'center', fontWeight: 900 }}>{cc.castNumber}</td>
                  <td style={{ fontWeight: 800 }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={cc.characterName}
                        onChange={(e) => {
                          const updated = sheetData.castCalls.map((c) =>
                            c.id === cc.id ? { ...c, characterName: e.target.value } : c
                          );
                          setSheetData({ ...sheetData, castCalls: updated });
                        }}
                        style={{ width: '100%', fontSize: '11.5px', border: '1px solid #000' }}
                      />
                    ) : (
                      cc.characterName
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={cc.actorName}
                        onChange={(e) => {
                          const updated = sheetData.castCalls.map((c) =>
                            c.id === cc.id ? { ...c, actorName: e.target.value } : c
                          );
                          setSheetData({ ...sheetData, castCalls: updated });
                        }}
                        style={{ width: '100%', fontSize: '11.5px', border: '1px solid #000' }}
                      />
                    ) : (
                      cc.actorName
                    )}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 900 }}>
                    {cc.status || 'W'}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={cc.pickupTime}
                        onChange={(e) => {
                          const updated = sheetData.castCalls.map((c) =>
                            c.id === cc.id ? { ...c, pickupTime: e.target.value } : c
                          );
                          setSheetData({ ...sheetData, castCalls: updated });
                        }}
                        style={{ width: '50px', fontSize: '11px', textAlign: 'center' }}
                      />
                    ) : (
                      cc.pickupTime
                    )}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={cc.makeupTime}
                        onChange={(e) => {
                          const updated = sheetData.castCalls.map((c) =>
                            c.id === cc.id ? { ...c, makeupTime: e.target.value } : c
                          );
                          setSheetData({ ...sheetData, castCalls: updated });
                        }}
                        style={{ width: '50px', fontSize: '11px', textAlign: 'center' }}
                      />
                    ) : (
                      cc.makeupTime
                    )}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 900, backgroundColor: '#f4f4f5' }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={cc.onSetTime}
                        onChange={(e) => {
                          const updated = sheetData.castCalls.map((c) =>
                            c.id === cc.id ? { ...c, onSetTime: e.target.value } : c
                          );
                          setSheetData({ ...sheetData, castCalls: updated });
                        }}
                        style={{ width: '50px', fontSize: '11px', textAlign: 'center', fontWeight: 900 }}
                      />
                    ) : (
                      cc.onSetTime
                    )}
                  </td>
                  <td style={{ fontSize: '11px' }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={cc.notes || ''}
                        onChange={(e) => {
                          const updated = sheetData.castCalls.map((c) =>
                            c.id === cc.id ? { ...c, notes: e.target.value } : c
                          );
                          setSheetData({ ...sheetData, castCalls: updated });
                        }}
                        style={{ width: '100%', fontSize: '11px' }}
                      />
                    ) : (
                      cc.notes
                    )}
                  </td>
                  {isEditing && (
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleRemoveCastRow(cc.id)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Extras & Atmosphere Crowd Table */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              padding: '5px 10px',
              fontSize: '11px',
              fontWeight: 900,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>BACKGROUND ATMOSPHERE & EXTRAS CROWD</span>
            {isEditing && (
              <button
                onClick={handleAddExtrasRow}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  cursor: 'pointer',
                }}
              >
                + Add Extras Group
              </button>
            )}
          </div>

          <table className="sharp-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>GROUP / ATMOSPHERE</th>
                <th style={{ width: '70px', textAlign: 'center' }}>COUNT</th>
                <th style={{ width: '80px', textAlign: 'center' }}>CALL TIME</th>
                <th style={{ textAlign: 'left' }}>WARDROBE & SPECIAL INSTRUCTIONS</th>
                {isEditing && <th style={{ width: '40px', textAlign: 'center' }}>DEL</th>}
              </tr>
            </thead>
            <tbody>
              {(sheetData.extrasCalls || []).map((ex) => (
                <tr key={ex.id}>
                  <td style={{ fontWeight: 800 }}>{ex.groupName}</td>
                  <td style={{ textAlign: 'center', fontWeight: 900 }}>{ex.count}</td>
                  <td style={{ textAlign: 'center', fontWeight: 900 }}>{ex.callTime}</td>
                  <td style={{ fontSize: '11px' }}>{ex.wardrobeNotes}</td>
                  {isEditing && (
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleRemoveExtrasRow(ex.id)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Department Requirements & Safety Directives Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            border: '1.5px solid #000000',
            marginBottom: '18px',
            fontSize: '11.5px',
          }}
        >
          <div style={{ padding: '10px 14px', borderRight: '1.5px solid #000000', borderBottom: '1.5px solid #000000' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '3px' }}>
              <Flame size={13} color="#000000" /> STUNTS, WEAPONS & PRACTICAL SFX
            </div>
            <p style={{ margin: 0, lineHeight: '1.4', fontSize: '11px' }}>
              {sheetData.stuntSfxNotes || '20 Rubber blunt machetes inspected by Armourer. 8 Kerosene torches active. Controlled rain machine and low ground fog ready.'}
            </p>
          </div>

          <div style={{ padding: '10px 14px', borderBottom: '1.5px solid #000000' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '3px' }}>
              <Camera size={13} color="#000000" /> CAMERA, GRIP & LIGHTING RIGS
            </div>
            <p style={{ margin: 0, lineHeight: '1.4', fontSize: '11px' }}>
              {sheetData.cameraNotes || 'A-Cam 30ft Technocrane with 50mm Anamorphic. B-Cam Steadicam. C-Cam Phantom High-Speed (240 FPS) for spark deflections.'}
            </p>
          </div>

          <div style={{ padding: '10px 14px', borderRight: '1.5px solid #000000' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '3px' }}>
              <Utensils size={13} color="#000000" /> CATERING & MEAL SCHEDULE
            </div>
            <p style={{ margin: 0, lineHeight: '1.4', fontSize: '11px' }}>
              {sheetData.cateringNotes || 'Evening Tea/Tiffin: 16:30. Hot Midnight Dinner: 23:30. Continuous filter coffee / herbal tea station active throughout night.'}
            </p>
          </div>

          <div style={{ padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '3px' }}>
              <AlertTriangle size={13} color="#000000" /> MANDATORY SAFETY INSTRUCTIONS
            </div>
            <p style={{ margin: 0, lineHeight: '1.4', fontSize: '11px' }}>
              {sheetData.advancedScheduleNotes}
            </p>
          </div>
        </div>

        {/* Advance Notice / Tomorrow's Preview (Day X + 1) */}
        <div
          style={{
            border: '1.5px solid #000000',
            backgroundColor: '#000000',
            color: '#ffffff',
            padding: '8px 14px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#f59e0b' }}>
            TOMORROW'S ADVANCE PREVIEW:
          </span>
          <span style={{ fontWeight: 500 }}>
            {sheetData.tomorrowPreview || 'Day 2: INT. ABANDONED SUGAR MILL. Scene 3 & 4. Chase sequence continuation.'}
          </span>
        </div>
      </div>
    </div>
  );
};
