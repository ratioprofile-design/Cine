import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { parseDocxFile } from '../services/docxParser';
import { parseSpreadsheetFile, parsePastedTable } from '../services/spreadsheetParser';
import { parseScreenplay } from '../services/scriptParser';
import { convertToUnicode } from '../services/tamilTranscoder';
import { Scene } from '../types/production';
import {
  FileDown,
  FileText,
  FileSpreadsheet,
  FileCode,
  X,
  Upload,
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (scenes: Scene[], rawScript: string, title?: string) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const { t, autoConvertBamini } = useLanguage();
  const [activeTab, setActiveTab] = useState<'word' | 'excel' | 'fountain'>('word');
  const [pastedText, setPastedText] = useState('');
  const [googleSheetsPasted, setGoogleSheetsPasted] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  // Handle Word (.docx) File Upload
  const handleWordFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setStatusMsg('Extracting text from Word document...');

    try {
      const scriptText = await parseDocxFile(file);
      const cleanedScript = autoConvertBamini ? convertToUnicode(scriptText) : scriptText;
      const scenes = parseScreenplay(cleanedScript);

      const title = file.name.replace(/\.[^/.]+$/, '');
      onImportSuccess(scenes, cleanedScript, title);
      onClose();
    } catch (err: any) {
      alert(`Error reading Word document: ${err.message}`);
    } finally {
      setIsLoading(false);
      setStatusMsg('');
    }
  };

  // Handle Excel (.xlsx, .csv) File Upload
  const handleExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setStatusMsg('Parsing production breakdown spreadsheet...');

    try {
      const result = await parseSpreadsheetFile(file);
      const title = file.name.replace(/\.[^/.]+$/, '');
      onImportSuccess(result.scenes, result.scriptText, title);
      onClose();
    } catch (err: any) {
      alert(`Error reading spreadsheet: ${err.message}`);
    } finally {
      setIsLoading(false);
      setStatusMsg('');
    }
  };

  // Handle Google Sheets Pasted TSV
  const handleGoogleSheetsPaste = () => {
    if (!googleSheetsPasted.trim()) return;

    try {
      const result = parsePastedTable(googleSheetsPasted);
      if (result.scenes.length === 0) {
        alert('Could not detect scenes in pasted table. Please check headers.');
        return;
      }
      onImportSuccess(result.scenes, result.scriptText, 'Google Sheets Import');
      onClose();
    } catch (err: any) {
      alert(`Error parsing table: ${err.message}`);
    }
  };

  // Handle Fountain or Plain Text script paste
  const handleFountainPaste = () => {
    if (!pastedText.trim()) return;

    const cleanedText = autoConvertBamini ? convertToUnicode(pastedText) : pastedText;
    const scenes = parseScreenplay(cleanedText);

    if (scenes.length === 0) {
      alert('No scene sluglines found. Screenplays usually start with INT. or EXT. or காட்சி.');
      return;
    }

    onImportSuccess(scenes, cleanedText, 'Imported Script');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '640px',
          borderRadius: '8px',
          padding: '24px',
          backgroundColor: '#ffffff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Top Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileDown size={20} color="#0f172a" />
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              {t.importModalTitle}
            </h3>
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

        {/* Tab Headers */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '12px',
            marginBottom: '20px',
          }}
        >
          <button
            onClick={() => setActiveTab('word')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'word' ? '1px solid #0f172a' : '1px solid transparent',
              backgroundColor: activeTab === 'word' ? '#0f172a' : 'transparent',
              color: activeTab === 'word' ? '#ffffff' : '#64748b',
            }}
          >
            <FileText size={15} color={activeTab === 'word' ? '#ffffff' : '#0284c7'} />
            <span>{t.tabWord}</span>
          </button>

          <button
            onClick={() => setActiveTab('excel')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'excel' ? '1px solid #0f172a' : '1px solid transparent',
              backgroundColor: activeTab === 'excel' ? '#0f172a' : 'transparent',
              color: activeTab === 'excel' ? '#ffffff' : '#64748b',
            }}
          >
            <FileSpreadsheet size={15} color={activeTab === 'excel' ? '#ffffff' : '#059669'} />
            <span>{t.tabExcel}</span>
          </button>

          <button
            onClick={() => setActiveTab('fountain')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'fountain' ? '1px solid #0f172a' : '1px solid transparent',
              backgroundColor: activeTab === 'fountain' ? '#0f172a' : 'transparent',
              color: activeTab === 'fountain' ? '#ffffff' : '#64748b',
            }}
          >
            <FileCode size={15} color={activeTab === 'fountain' ? '#ffffff' : '#d97706'} />
            <span>{t.tabFountain}</span>
          </button>
        </div>

        {/* Tab 1: Word & Google Docs */}
        {activeTab === 'word' && (
          <div>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
              Upload Microsoft Word files (<code>.docx</code>) or scripts downloaded from Google Docs.
              Tamil fonts and formatting will be automatically extracted and normalized.
            </p>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                border: '2px dashed #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: '#f8fafc',
                transition: 'border-color 0.2s',
              }}
            >
              <Upload size={32} color="#0284c7" style={{ marginBottom: '10px' }} />
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>{t.wordDropzone}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Supports .docx files exported from Word or Google Docs
              </div>
              <input type="file" accept=".docx" onChange={handleWordFile} style={{ display: 'none' }} />
            </label>
          </div>
        )}

        {/* Tab 2: Excel & Google Sheets */}
        {activeTab === 'excel' && (
          <div>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
              Import production breakdown sheets from Excel (<code>.xlsx</code>, <code>.csv</code>) or paste copied table cells directly from Google Sheets.
            </p>

            {/* File Upload */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '16px',
                border: '1px dashed #059669',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: '#ecfdf5',
                marginBottom: '16px',
              }}
            >
              <Upload size={18} color="#059669" />
              <span style={{ fontWeight: 700, color: '#065f46', fontSize: '12.5px' }}>{t.excelDropzone}</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelFile} style={{ display: 'none' }} />
            </label>

            {/* Google Sheets TSV Paste Box */}
            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                {t.pasteGoogleSheets}
              </label>
              <textarea
                rows={4}
                value={googleSheetsPasted}
                onChange={(e) => setGoogleSheetsPasted(e.target.value)}
                placeholder="Copy rows in Google Sheets (Scene # | INT/EXT | Location | Time | Description) and paste here..."
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#0f172a',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              />
              <button
                onClick={handleGoogleSheetsPaste}
                disabled={!googleSheetsPasted.trim()}
                className="btn-primary"
                style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}
              >
                Import from Pasted Google Sheets
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Fountain / Plain Text Script */}
        {activeTab === 'fountain' && (
          <div>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
              Paste your screenplay in Fountain or standard script format. Supports bilingual Tamil and English headings.
            </p>

            <textarea
              rows={8}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={t.pasteScriptPlaceholder}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#0f172a',
                fontSize: '13px',
                fontFamily: 'Courier Prime, monospace',
                resize: 'vertical',
              }}
            />

            <button
              onClick={handleFountainPaste}
              disabled={!pastedText.trim()}
              className="btn-primary"
              style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}
            >
              Parse & Load Screenplay
            </button>
          </div>
        )}

        {isLoading && (
          <div style={{ textAlign: 'center', marginTop: '16px', color: '#0284c7', fontSize: '12.5px', fontWeight: 600 }}>
            {statusMsg || t.loading}
          </div>
        )}
      </div>
    </div>
  );
};
