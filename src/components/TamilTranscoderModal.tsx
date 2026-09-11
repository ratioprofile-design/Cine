import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { convertToUnicode, FontEncoding } from '../services/tamilTranscoder';
import { parseScreenplay } from '../services/scriptParser';
import { Scene } from '../types/production';
import {
  Type,
  X,
  Copy,
  Check,
  Sparkles,
  FileCheck,
} from 'lucide-react';

interface TamilTranscoderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyScript: (scenes: Scene[], rawScript: string) => void;
}

export const TamilTranscoderModal: React.FC<TamilTranscoderModalProps> = ({
  isOpen,
  onClose,
  onApplyScript,
}) => {
  const { t } = useLanguage();
  const [encoding, setEncoding] = useState<FontEncoding>('BAMINI');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleConvert = () => {
    if (!inputText.trim()) return;
    const unicode = convertToUnicode(inputText, encoding);
    setOutputText(unicode);
  };

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyToScript = () => {
    if (!outputText.trim()) return;
    const scenes = parseScreenplay(outputText);
    onApplyScript(scenes, outputText);
    onClose();
  };

  const handleLoadSampleBamini = () => {
    const sampleBamini = `fhl;rp 1: ntsp. kJiu kPdhl;rp mk;kd; Nfhtpy; - ,uT\n\nthdk; ,Uz;L fplf;fpwJ. gyj;j ,bRow;rpAld; kiw nfhj;jpj; jPh;f;fpwJ.\n\nMjp\nur;rpdk;! cd; rhk;uh[;ak; ,Njhj KbaPJlh!`;
    setInputText(sampleBamini);
    const converted = convertToUnicode(sampleBamini, 'BAMINI');
    setOutputText(converted);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '780px',
          borderRadius: '8px',
          padding: '24px',
          backgroundColor: '#ffffff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Type size={18} color="#b45309" />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                {t.tamilConverter}
              </h3>
              <p style={{ fontSize: '11px', color: '#64748b' }}>
                {t.transcoderDesc}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Options Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            padding: '10px 14px',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
              {t.legacyFontSelect}:
            </span>
            <select
              value={encoding}
              onChange={(e) => setEncoding(e.target.value as FontEncoding)}
              style={{
                padding: '5px 10px',
                borderRadius: '4px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                outline: 'none',
              }}
            >
              <option value="BAMINI">Bamini / Baamini (பாமினி)</option>
              <option value="TAM">TAM (Tamil Monolingual)</option>
              <option value="TAB">TAB (Tamil Bilingual)</option>
              <option value="AUTO">Auto-Detect Encoding</option>
            </select>
          </div>

          <button
            onClick={handleLoadSampleBamini}
            className="btn-secondary"
            style={{ fontSize: '11.5px', padding: '4px 10px' }}
          >
            Load Sample Bamini Text
          </button>
        </div>

        {/* Two Column Transcoder Panes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* Legacy Input */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
              Legacy Font Input (Bamini / TAM / TAB)
            </label>
            <textarea
              rows={8}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.legacyInputPlaceholder}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#0f172a',
                fontSize: '13px',
                fontFamily: 'monospace',
                resize: 'none',
              }}
            />
          </div>

          {/* Unicode Output */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', color: '#b45309', fontWeight: 800 }}>
                Unicode Tamil Output (தூய தமிழ்)
              </label>
              {outputText && (
                <button
                  onClick={handleCopy}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: copied ? '#059669' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
            <textarea
              rows={8}
              readOnly
              value={outputText}
              placeholder={t.unicodeOutputPlaceholder}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#0f172a',
                fontSize: '13.5px',
                fontFamily: 'Noto Sans Tamil, sans-serif',
                resize: 'none',
              }}
            />
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={handleConvert} disabled={!inputText.trim()} className="btn-secondary">
            <Sparkles size={14} color="#b45309" />
            <span>{t.transcodeBtn}</span>
          </button>

          <button
            onClick={handleApplyToScript}
            disabled={!outputText.trim()}
            className="btn-primary"
          >
            <FileCheck size={14} />
            <span>{t.applyToScript}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
