import React, { useState } from 'react';
import { useLanguage, BreakdownLanguage } from '../i18n/LanguageContext';
import {
  getApiKey,
  setApiKey,
  testGeminiApiKey,
  getSelectedModel,
  setSelectedModel,
} from '../services/gemini';
import { convertToUnicode } from '../services/tamilTranscoder';
import {
  KeyRound,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Languages,
  Type,
  Sparkles,
  Settings,
  FileCode2,
  Check,
} from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const {
    language,
    breakdownLanguage,
    setBreakdownLanguage,
    autoConvertBamini,
    setAutoConvertBamini,
    fontFamily,
    setFontFamily,
  } = useLanguage();

  const [apiKeyInput, setApiKeyInput] = useState(getApiKey());
  const [modelInput, setModelInput] = useState(getSelectedModel());
  const [selectedBreakdownLang, setSelectedBreakdownLang] = useState<BreakdownLanguage>(breakdownLanguage);
  const [isBaminiAutoConvert, setIsBaminiAutoConvert] = useState<boolean>(autoConvertBamini);
  const [selectedFont, setSelectedFont] = useState(fontFamily);
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message?: string }>({
    status: 'idle',
  });

  // Live Bamini test helper
  const [baminiTestInput, setBaminiTestInput] = useState('fhl;rp 1: ntspe. kJiu kPdhl;rp mk;kd; Nfhapy; tPjp - ,uth');

  if (!isOpen) return null;

  const handleSave = () => {
    setApiKey(apiKeyInput);
    setSelectedModel(modelInput);
    setBreakdownLanguage(selectedBreakdownLang);
    setAutoConvertBamini(isBaminiAutoConvert);
    setFontFamily(selectedFont);
    onClose();
  };

  const handleTestConnection = async () => {
    setTestResult({ status: 'testing' });
    const res = await testGeminiApiKey(apiKeyInput);
    if (res.success) {
      setTestResult({ status: 'success', message: res.message });
    } else {
      setTestResult({ status: 'error', message: res.message });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          borderRadius: '8px',
          padding: '24px 28px',
          backgroundColor: '#ffffff',
          boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.12)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            borderBottom: '1px solid #e4e4e7',
            paddingBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} color="#18181b" />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#18181b' }}>
              {language === 'ta' ? 'அமைப்புகள் & AI கட்டமைப்பு' : 'Studio Settings & AI Configuration'}
            </h3>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#71717a',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* SECTION 1: Bamini / Legacy Tamil Font Conversion Setting */}
        <div
          style={{
            marginBottom: '20px',
            padding: '14px',
            borderRadius: '6px',
            backgroundColor: '#fafafa',
            border: '1px solid #e4e4e7',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileCode2 size={16} color="#0284c7" />
              <label style={{ fontSize: '13px', color: '#18181b', fontWeight: 800 }}>
                {language === 'ta'
                  ? 'பாமினி / Azhagi எழுத்துருவை யுனிகோடாக மாற்று (Bamini to Unicode)'
                  : 'Bamini / Legacy Tamil Font Auto-Conversion'}
              </label>
            </div>

            {/* Toggle Switch */}
            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '6px' }}>
              <input
                type="checkbox"
                checked={isBaminiAutoConvert}
                onChange={(e) => setIsBaminiAutoConvert(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#18181b' }}
              />
              <span style={{ fontSize: '12px', fontWeight: 700, color: isBaminiAutoConvert ? '#16a34a' : '#71717a' }}>
                {isBaminiAutoConvert ? (language === 'ta' ? 'செயலில் உள்ளது' : 'Enabled (Default)') : (language === 'ta' ? 'முடக்கப்பட்டது' : 'Disabled')}
              </span>
            </label>
          </div>

          <p style={{ fontSize: '11.5px', color: '#52525b', lineHeight: '1.45', margin: '0 0 10px 0' }}>
            {language === 'ta'
              ? 'மைக்ரோசாப்ட் வேர்ட் (Word), Google Docs அல்லது பழைய தட்டச்சு எழுத்துருக்களில் (Bamini, Azhagi, NHM, Shree-Lipi) தட்டச்சு செய்யப்பட்ட திரைக்கதையை பதிவேற்றும் போது தானாகவே நவீன தமிழ் யுனிகோடாக (Unicode) மாற்றும்.'
              : 'When uploading Word documents (.docx) or pasting scripts typed in Bamini, Azhagi, or Shree-Lipi typewriter fonts, automatically convert them into clean Tamil Unicode.'}
          </p>

          {/* Quick Live Transcoding Preview */}
          <div
            style={{
              padding: '8px 10px',
              backgroundColor: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: '4px',
              fontSize: '11px',
            }}
          >
            <div style={{ color: '#71717a', fontSize: '10.5px', marginBottom: '3px' }}>
              <strong>Live Sample Test:</strong> Type or paste Bamini text below to test:
            </div>
            <input
              type="text"
              value={baminiTestInput}
              onChange={(e) => setBaminiTestInput(e.target.value)}
              style={{
                width: '100%',
                fontSize: '11.5px',
                padding: '4px 6px',
                border: '1px solid #cbd5e1',
                borderRadius: '3px',
                marginBottom: '4px',
                fontFamily: 'monospace',
              }}
            />
            <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: 700 }}>
              ➜ Unicode Result: {convertToUnicode(baminiTestInput)}
            </div>
          </div>
        </div>

        {/* SECTION 2: Script Breakdown Language Setting */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Languages size={15} color="#d97706" />
            <label style={{ fontSize: '12.5px', color: '#18181b', fontWeight: 700 }}>
              {language === 'ta' ? 'திரைக்கதை பகுப்பாய்வு மொழி (Breakdown Output Language)' : 'Script Breakdown Output Language'}
            </label>
          </div>
          <p style={{ fontSize: '11px', color: '#71717a', marginBottom: '10px' }}>
            {language === 'ta'
              ? 'AI மற்றும் காட்சி விவரப் பலகையில் தயாரிப்பு குறிப்புகள், பொருட்கள், சண்டை மற்றும் கதாபாத்திரங்கள் எந்த மொழியில் உருவாக்கப்பட வேண்டும் என்பதை தேர்வு செய்யவும்.'
              : 'Select the primary language for AI element extraction, department categorizations, props, stunts, and synopses.'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {/* Tamil Option */}
            <div
              onClick={() => setSelectedBreakdownLang('ta')}
              style={{
                padding: '10px 10px',
                borderRadius: '6px',
                border: selectedBreakdownLang === 'ta' ? '2px solid #18181b' : '1px solid #e4e4e7',
                backgroundColor: selectedBreakdownLang === 'ta' ? '#fafafa' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.1s ease',
              }}
            >
              <div style={{ fontSize: '18px', marginBottom: '2px' }}>🇮🇳</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#18181b' }}>தமிழ் (Tamil)</div>
              <div style={{ fontSize: '9.5px', color: '#71717a', marginTop: '2px' }}>Kollywood Edition</div>
            </div>

            {/* English Option */}
            <div
              onClick={() => setSelectedBreakdownLang('en')}
              style={{
                padding: '10px 10px',
                borderRadius: '6px',
                border: selectedBreakdownLang === 'en' ? '2px solid #18181b' : '1px solid #e4e4e7',
                backgroundColor: selectedBreakdownLang === 'en' ? '#fafafa' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.1s ease',
              }}
            >
              <div style={{ fontSize: '18px', marginBottom: '2px' }}>🇬🇧</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#18181b' }}>English</div>
              <div style={{ fontSize: '9.5px', color: '#71717a', marginTop: '2px' }}>Hollywood Standard</div>
            </div>

            {/* Auto / Match UI Option */}
            <div
              onClick={() => setSelectedBreakdownLang('auto')}
              style={{
                padding: '10px 10px',
                borderRadius: '6px',
                border: selectedBreakdownLang === 'auto' ? '2px solid #18181b' : '1px solid #e4e4e7',
                backgroundColor: selectedBreakdownLang === 'auto' ? '#fafafa' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.1s ease',
              }}
            >
              <div style={{ fontSize: '18px', marginBottom: '2px' }}>🌐</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#18181b' }}>Auto / UI Match</div>
              <div style={{ fontSize: '9.5px', color: '#71717a', marginTop: '2px' }}>Follows App Lang</div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Typography & Font Family */}
        <div style={{ marginBottom: '22px', borderTop: '1px solid #f4f4f5', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Type size={15} color="#2563eb" />
            <label style={{ fontSize: '12.5px', color: '#18181b', fontWeight: 700 }}>
              {language === 'ta' ? 'திரைக்கதை எழுத்துரு (Screenplay Font)' : 'Screenplay Typography'}
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setSelectedFont('tamil-modern')}
              style={{
                padding: '8px 10px',
                borderRadius: '5px',
                border: selectedFont === 'tamil-modern' ? '2px solid #18181b' : '1px solid #e4e4e7',
                backgroundColor: selectedFont === 'tamil-modern' ? '#f4f4f5' : '#ffffff',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Noto Sans Tamil, sans-serif',
              }}
            >
              Noto Sans Tamil
            </button>

            <button
              type="button"
              onClick={() => setSelectedFont('tamil-serif')}
              style={{
                padding: '8px 10px',
                borderRadius: '5px',
                border: selectedFont === 'tamil-serif' ? '2px solid #18181b' : '1px solid #e4e4e7',
                backgroundColor: selectedFont === 'tamil-serif' ? '#f4f4f5' : '#ffffff',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Mukta Malar, serif',
              }}
            >
              Mukta Malar
            </button>

            <button
              type="button"
              onClick={() => setSelectedFont('default')}
              style={{
                padding: '8px 10px',
                borderRadius: '5px',
                border: selectedFont === 'default' ? '2px solid #18181b' : '1px solid #e4e4e7',
                backgroundColor: selectedFont === 'default' ? '#f4f4f5' : '#ffffff',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Courier Prime, monospace',
              }}
            >
              Courier Prime
            </button>
          </div>
        </div>

        {/* SECTION 4: Gemini AI API Key & Model */}
        <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Sparkles size={15} color="#f59e0b" />
            <label style={{ fontSize: '12.5px', color: '#18181b', fontWeight: 700 }}>
              Google Gemini AI Engine
            </label>
          </div>

          {/* API Key */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11.5px', color: '#71717a', fontWeight: 600, marginBottom: '4px' }}>
              Gemini API Key
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                style={{
                  width: '100%',
                  padding: '8px 36px 8px 10px',
                  borderRadius: '5px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e4e4e7',
                  color: '#18181b',
                  fontSize: '12.5px',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#71717a',
                  cursor: 'pointer',
                }}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Model Selection */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11.5px', color: '#71717a', fontWeight: 600, marginBottom: '4px' }}>
              AI Model
            </label>
            <select
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '5px',
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                color: '#18181b',
                fontSize: '12px',
                outline: 'none',
              }}
            >
              <option value="gemini-3.6-flash">gemini-3.6-flash (Official Active Production Model)</option>
              <option value="gemini-3.5-flash">gemini-3.5-flash</option>
              <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
              <option value="gemini-flash-latest">gemini-flash-latest</option>
            </select>
          </div>

          {/* Test Connection Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testResult.status === 'testing'}
              className="btn-clean"
              style={{ fontSize: '11.5px', padding: '4px 10px' }}
            >
              {testResult.status === 'testing' ? 'Connecting...' : 'Test Connection'}
            </button>

            {testResult.status === 'success' && (
              <span style={{ fontSize: '11.5px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <CheckCircle2 size={13} /> {testResult.message}
              </span>
            )}

            {testResult.status === 'error' && (
              <span style={{ fontSize: '11.5px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={13} /> {testResult.message}
              </span>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '8px',
            borderTop: '1px solid #e4e4e7',
            paddingTop: '14px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-clean"
            style={{ padding: '6px 14px' }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="btn-clean-dark"
            style={{ padding: '6px 18px' }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
