import React, { useState, useRef, useEffect } from 'react';
import { ProductionDocument, DocumentAnnotation, AnnotationType } from '../../types/production';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  FileText,
  Upload,
  Highlighter,
  PenTool,
  Type,
  Square,
  StickyNote,
  Eraser,
  Trash2,
  Printer,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Folder,
  Plus,
  Check,
  X,
  MessageSquare,
  Shield,
  Palette,
  FileCheck,
  Scale,
  Hand,
} from 'lucide-react';

interface DocumentVaultProps {
  documents: ProductionDocument[];
  onUpdateDocuments: (docs: ProductionDocument[]) => void;
}

const HIGHLIGHT_COLORS = ['#fde047', '#86efac', '#93c5fd', '#f472b6'];
const PEN_COLORS = ['#dc2626', '#18181b', '#2563eb', '#16a34a', '#d97706'];

export const DocumentVault: React.FC<DocumentVaultProps> = ({
  documents,
  onUpdateDocuments,
}) => {
  const { language, t } = useLanguage();
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Active Annotation Tool
  const [activeTool, setActiveTool] = useState<AnnotationType | 'hand'>('hand');
  const [activeColor, setActiveColor] = useState<string>('#fde047');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number }>>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Active note popup
  const [activeNote, setActiveNote] = useState<{ x: number; y: number; text: string } | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const svgOverlayRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  // Current page annotations
  const pageAnnotations = (selectedDoc?.annotations || []).filter(
    (a) => a.pageNumber === currentPage
  );

  const totalPages = selectedDoc?.pageCount || 1;

  // Change selected doc
  const handleSelectDoc = (id: string) => {
    setSelectedDocId(id);
    setCurrentPage(1);
    setActiveNote(null);
  };

  // Filtered documents
  const filteredDocs = documents.filter((d) => {
    if (selectedCategory === 'ALL') return true;
    return d.category === selectedCategory;
  });

  // Handle PDF Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const newDoc: ProductionDocument = {
        id: `doc-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        titleTa: file.name.replace(/\.[^/.]+$/, ''),
        category: 'OTHER',
        fileName: file.name,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        pageCount: 3, // default estimates
        uploadedAt: new Date().toISOString(),
        pdfDataUrl: dataUrl,
        annotations: [],
      };

      const updated = [newDoc, ...documents];
      onUpdateDocuments(updated);
      setSelectedDocId(newDoc.id);
      setCurrentPage(1);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Add Annotation
  const handleAddAnnotation = (ann: Omit<DocumentAnnotation, 'id' | 'documentId' | 'pageNumber' | 'createdAt'>) => {
    if (!selectedDoc) return;
    const newAnnotation: DocumentAnnotation = {
      ...ann,
      id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      documentId: selectedDoc.id,
      pageNumber: currentPage,
      createdAt: new Date().toISOString(),
      author: '1st AD',
    };

    const updated = documents.map((d) => {
      if (d.id === selectedDoc.id) {
        return {
          ...d,
          annotations: [...(d.annotations || []), newAnnotation],
        };
      }
      return d;
    });

    onUpdateDocuments(updated);
  };

  // Delete single annotation
  const handleDeleteAnnotation = (id: string) => {
    if (!selectedDoc) return;
    const updated = documents.map((d) => {
      if (d.id === selectedDoc.id) {
        return {
          ...d,
          annotations: (d.annotations || []).filter((a) => a.id !== id),
        };
      }
      return d;
    });
    onUpdateDocuments(updated);
  };

  // Clear current page annotations
  const handleClearPageAnnotations = () => {
    if (!selectedDoc) return;
    if (confirm('Clear all annotations on this page?')) {
      const updated = documents.map((d) => {
        if (d.id === selectedDoc.id) {
          return {
            ...d,
            annotations: (d.annotations || []).filter((a) => a.pageNumber !== currentPage),
          };
        }
        return d;
      });
      onUpdateDocuments(updated);
    }
  };

  // Delete Document
  const handleDeleteDoc = (id: string) => {
    if (documents.length <= 1) {
      alert('You must have at least one document in the vault.');
      return;
    }
    if (confirm('Delete this document from the vault?')) {
      const updated = documents.filter((d) => d.id !== id);
      onUpdateDocuments(updated);
      if (selectedDocId === id) {
        setSelectedDocId(updated[0].id);
        setCurrentPage(1);
      }
    }
  };

  // Mouse Coordinates helper
  const getCoordinates = (e: React.MouseEvent<SVGSVGElement>): { x: number; y: number } | null => {
    if (!svgOverlayRef.current) return null;
    const rect = svgOverlayRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    const y = ((e.clientY - rect.top) / rect.height) * 1100;
    return { x, y };
  };

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'hand') return;
    const coords = getCoordinates(e);
    if (!coords) return;

    if (activeTool === 'pen') {
      setIsDrawing(true);
      setCurrentPath([coords]);
    } else if (activeTool === 'highlight' || activeTool === 'rect') {
      setIsDrawing(true);
      setStartPoint(coords);
      setCurrentRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
    } else if (activeTool === 'note') {
      setActiveNote({ x: coords.x, y: coords.y, text: '' });
    } else if (activeTool === 'text') {
      const text = prompt('Enter text annotation:');
      if (text && text.trim()) {
        handleAddAnnotation({
          type: 'text',
          color: activeColor,
          x: coords.x,
          y: coords.y,
          text: text.trim(),
        });
      }
    }
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    if (activeTool === 'pen') {
      setCurrentPath((prev) => [...prev, coords]);
    } else if ((activeTool === 'highlight' || activeTool === 'rect') && startPoint) {
      const x = Math.min(startPoint.x, coords.x);
      const y = Math.min(startPoint.y, coords.y);
      const width = Math.abs(coords.x - startPoint.x);
      const height = Math.abs(coords.y - startPoint.y);
      setCurrentRect({ x, y, width, height });
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === 'pen' && currentPath.length > 1) {
      handleAddAnnotation({
        type: 'pen',
        color: activeColor,
        strokeWidth: strokeWidth,
        points: currentPath,
      });
      setCurrentPath([]);
    } else if (activeTool === 'highlight' && currentRect && currentRect.width > 5) {
      handleAddAnnotation({
        type: 'highlight',
        color: activeColor,
        opacity: 0.38,
        x: currentRect.x,
        y: currentRect.y,
        width: currentRect.width,
        height: Math.max(currentRect.height, 22),
      });
      setCurrentRect(null);
      setStartPoint(null);
    } else if (activeTool === 'rect' && currentRect && currentRect.width > 5) {
      handleAddAnnotation({
        type: 'rect',
        color: activeColor,
        strokeWidth: strokeWidth,
        x: currentRect.x,
        y: currentRect.y,
        width: currentRect.width,
        height: currentRect.height,
      });
      setCurrentRect(null);
      setStartPoint(null);
    }
  };

  // Save Sticky Note
  const handleSaveStickyNote = () => {
    if (!activeNote || !activeNote.text.trim()) {
      setActiveNote(null);
      return;
    }

    handleAddAnnotation({
      type: 'note',
      color: activeColor,
      x: activeNote.x,
      y: activeNote.y,
      text: activeNote.text.trim(),
    });
    setActiveNote(null);
  };

  // Category Badges & Icons
  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case 'LOOKBOOK':
        return { label: 'Lookbook', icon: Palette, color: '#ec4899' };
      case 'CALLSHEET':
        return { label: 'Call Sheet', icon: FileCheck, color: '#0284c7' };
      case 'SAFETY':
        return { label: 'Safety Protocol', icon: Shield, color: '#dc2626' };
      case 'PERMIT':
        return { label: 'Permit', icon: Scale, color: '#16a34a' };
      case 'CONTRACT':
        return { label: 'Contract', icon: FileText, color: '#8b5cf6' };
      default:
        return { label: 'Document', icon: FileText, color: '#71717a' };
    }
  };

  // Render Built-in Formatted Document Content
  const renderBuiltInPageContent = (doc: ProductionDocument, page: number) => {
    if (doc.builtInType === 'lookbook') {
      return (
        <div style={{ padding: '40px 48px', color: '#18181b', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ borderBottom: '2px solid #18181b', paddingBottom: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#ec4899', textTransform: 'uppercase' }}>
              DIRECTOR'S VISUAL TREATMENT & CINEMATOGRAPHY LOOKBOOK
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 900, margin: '6px 0 2px 0' }}>
              MADURAI CHITHIRAI ACTION SEQUENCE
            </h2>
            <div style={{ fontSize: '12px', color: '#71717a' }}>
              Production Draft • Madurai Meenakshi Temple Exterior • Night Action Block
            </div>
          </div>

          {page === 1 && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '6px' }}>1. CINEMATIC MOOD & LIGHTING PALETTE</h3>
                <p style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#3f3f46' }}>
                  The sequence takes place during the annual Chithirai festival at night. Thousands of golden brass lamps flicker in the foreground while massive HMI moonlight towers back-light the temple towers. Hero entrance must feature high-contrast amber rim lighting.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', margin: '20px 0' }}>
                <div style={{ height: '70px', backgroundColor: '#18181b', borderRadius: '4px', display: 'flex', alignItems: 'flex-end', padding: '6px', color: '#ffffff', fontSize: '10px', fontWeight: 700 }}>#18181B Noir</div>
                <div style={{ height: '70px', backgroundColor: '#d97706', borderRadius: '4px', display: 'flex', alignItems: 'flex-end', padding: '6px', color: '#ffffff', fontSize: '10px', fontWeight: 700 }}>#D97706 Amber</div>
                <div style={{ height: '70px', backgroundColor: '#dc2626', borderRadius: '4px', display: 'flex', alignItems: 'flex-end', padding: '6px', color: '#ffffff', fontSize: '10px', fontWeight: 700 }}>#DC2626 Vermilion</div>
                <div style={{ height: '70px', backgroundColor: '#1e3a8a', borderRadius: '4px', display: 'flex', alignItems: 'flex-end', padding: '6px', color: '#ffffff', fontSize: '10px', fontWeight: 700 }}>#1E3A8A Night Blue</div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '6px' }}>2. CAMERA MOVEMENT & ANAMORPHIC RIGGING</h3>
                <p style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#3f3f46' }}>
                  • <strong>A-Cam</strong>: ARRI Alexa Mini LF on 30ft Technocrane with 50mm Master Anamorphic Lens.<br />
                  • <strong>B-Cam</strong>: Steadicam operator tracking Aadhi from low-angle as he advances towards the 20 henchmen.<br />
                  • <strong>C-Cam</strong>: Phantom High-Speed camera (240 FPS) capturing weapon clashes and spark practicals.
                </p>
              </div>
            </div>
          )}

          {page === 2 && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '6px' }}>3. CHARACTER COSTUME & GRIT AESTHETIC</h3>
                <p style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#3f3f46' }}>
                  • <strong>Aadhi (Hero)</strong>: Pure black rough-weave Madurai silk veshti with silver chain and holy ash (Thiruneer) smeared on forehead. Weapon: 2.5ft curved Madurai machete with engraved silver handle.<br />
                  • <strong>Henchmen (20 Stunt Fighters)</strong>: Dark crimson and earth-toned dhotis with cloth waist wraps. Heavy bamboo lathis and fire torches.
                </p>
              </div>

              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '6px' }}>4. PRACTICAL SFX & PYROTECHNICS</h3>
                <p style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#3f3f46' }}>
                  Controlled spark machines placed behind the temple pillars for weapon deflection shots. Low-lying ground fog machine active across the entire stone courtyard to catch amber floor practicals.
                </p>
              </div>
            </div>
          )}

          {page === 3 && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '6px' }}>5. SHOT LIST & PACING BREAKDOWN</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f4f4f5', borderBottom: '2px solid #18181b' }}>
                      <th style={{ padding: '6px', textAlign: 'left' }}>Shot #</th>
                      <th style={{ padding: '6px', textAlign: 'left' }}>Framing</th>
                      <th style={{ padding: '6px', textAlign: 'left' }}>Lens</th>
                      <th style={{ padding: '6px', textAlign: 'left' }}>Action Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                      <td style={{ padding: '6px', fontWeight: 700 }}>1A</td>
                      <td style={{ padding: '6px' }}>Wide Crane</td>
                      <td style={{ padding: '6px' }}>35mm</td>
                      <td style={{ padding: '6px' }}>Thousands of devotees surround the chariot. Aadhi steps through.</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                      <td style={{ padding: '6px', fontWeight: 700 }}>1B</td>
                      <td style={{ padding: '6px' }}>Close Up</td>
                      <td style={{ padding: '6px' }}>85mm</td>
                      <td style={{ padding: '6px' }}>Aadhi draws the silver machete from under his shawl.</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                      <td style={{ padding: '6px', fontWeight: 700 }}>1C</td>
                      <td style={{ padding: '6px' }}>Low Steadicam</td>
                      <td style={{ padding: '6px' }}>40mm</td>
                      <td style={{ padding: '6px' }}>20 Henchmen charge in synchronized V-formation with fire torches.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (doc.builtInType === 'safety') {
      return (
        <div style={{ padding: '40px 48px', color: '#18181b', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ borderBottom: '2px solid #dc2626', paddingBottom: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              STUNT & PYROTECHNICS SAFETY PROTOCOL COMPLIANCE
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, margin: '6px 0 2px 0' }}>
              TEMPLE NIGHT ACTION SEQUENCE SAFETY MANUAL
            </h2>
            <div style={{ fontSize: '12px', color: '#71717a' }}>
              Stunt Master: Super Subbarayan Unit • 1st AD & Safety Marshal Certified
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#dc2626', marginBottom: '8px' }}>
              1. WEAPONS SAFETY & PROP INSPECTION
            </h3>
            <p style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#3f3f46' }}>
              • All 20 machetes and blades MUST be aluminum rubber-edge dull props certified by the Armourer.<br />
              • Zero live or sharpened steel blades are permitted on set.<br />
              • High-impact clash shots must use specialized rubber blunt swords.
            </p>

            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#dc2626', marginTop: '20px', marginBottom: '8px' }}>
              2. FIRE TORCH & PRACTICAL FLAME CONTROL
            </h3>
            <p style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#3f3f46' }}>
              • Maximum of 8 real kerosene torches active at any single take.<br />
              • 4 Dedicated Safety Marshals holding CO2 fire extinguishers and fire-retardant blankets stationed on left and right wings.<br />
              • Devotee extras crowd kept at minimum 25ft safety perimeter from stunt fighting zone.
            </p>

            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#dc2626', marginTop: '20px', marginBottom: '8px' }}>
              3. MEDICAL & EMERGENCY DISPATCH
            </h3>
            <p style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#3f3f46' }}>
              • On-set Ambulance with Paramedic unit parked at East Gopuram Gate 2.<br />
              • Designated Trauma Center: Madurai Meenakshi Mission Hospital (Phone: 0452-2588741).
            </p>
          </div>
        </div>
      );
    }

    if (doc.builtInType === 'permit') {
      return (
        <div style={{ padding: '40px 48px', color: '#18181b', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ borderBottom: '2px solid #16a34a', paddingBottom: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              GOVERNMENT OF TAMIL NADU • MUNICIPAL CORPORATION
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, margin: '6px 0 2px 0' }}>
              OFFICIAL FILM SHOOTING PERMIT & POLICE CLEARANCE
            </h2>
            <div style={{ fontSize: '12px', color: '#71717a' }}>
              Permit Ref: TN/MDU/FLM/2026/089 • Single Window Clearance Portal
            </div>
          </div>

          <div style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#3f3f46' }}>
            <p><strong>Applicant Production House:</strong> Antigravity Motion Pictures Ltd.</p>
            <p><strong>Approved Location:</strong> Madurai Meenakshi Amman Temple Outer Ring & Chithirai Street.</p>
            <p><strong>Approved Shoot Timings:</strong> 18:00 Hours to 06:00 Hours (Night Shift).</p>
            <p><strong>Authorized Vehicles & Generators:</strong> 2 Silent Generator Vans, 4 Vanity Vans, 1 Technocrane Carrier.</p>
            <p><strong>Police Security Escort:</strong> 6 Law & Order Constables + 2 Traffic Inspectors assigned.</p>
          </div>
        </div>
      );
    }

    if (doc.builtInType === 'contract') {
      return (
        <div style={{ padding: '40px 48px', color: '#18181b', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ borderBottom: '2px solid #8b5cf6', paddingBottom: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#8b5cf6', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              STANDARD FILM ARTIST TALENT AGREEMENT
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, margin: '6px 0 2px 0' }}>
              PRINCIPAL CAST CONTRACT: CHARACTER "AADHI"
            </h2>
            <div style={{ fontSize: '12px', color: '#71717a' }}>
              South Indian Cine Actors Association (Nadigar Sangam) Standard Form
            </div>
          </div>

          <div style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#3f3f46' }}>
            <p><strong>Total Guaranteed Shoot Days:</strong> 10 Days (Schedule 1: 5 Days Madurai, Schedule 2: 5 Days Chennai Studio).</p>
            <p><strong>Overtime Provisions:</strong> Standard 12-hour turnaround time mandatory between call sheets.</p>
            <p><strong>Stunt Double Authorization:</strong> Principal artist approved for medium-shot choreography; extreme falls performed by certified stunt double.</p>
          </div>
        </div>
      );
    }

    // Default Fallback
    return (
      <div style={{ padding: '40px 48px', color: '#18181b', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ borderBottom: '1px solid #e4e4e7', paddingBottom: '16px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{doc.title}</h2>
          <div style={{ fontSize: '12px', color: '#71717a' }}>{doc.fileName} • Page {page} of {doc.pageCount}</div>
        </div>
        <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#3f3f46' }}>
          This document is ready for annotation. Use the highlighter, pen, box, or sticky note tools from the top toolbar to mark directions, staging notes, safety warnings, and DOP framing.
        </p>
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '270px 1fr',
        height: '100vh',
        backgroundColor: '#f4f4f5',
        overflow: 'hidden',
      }}
    >
      {/* Hidden File Input for PDF Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* Left Panel: Document Library & Hub */}
      <div
        className="no-print"
        style={{
          borderRight: '1px solid #e4e4e7',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header & Upload Button */}
        <div style={{ padding: '14px 14px 10px 14px', borderBottom: '1px solid #e4e4e7' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Folder size={15} color="#18181b" />
              <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#18181b' }}>
                {language === 'ta' ? 'ஆவணப் பெட்டகம்' : 'Document Vault'}
              </h2>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-clean-dark"
              style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title={t.uploadPdfBtn}
            >
              <Plus size={12} />
              <span>{t.uploadPdfBtn}</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['ALL', 'LOOKBOOK', 'CALLSHEET', 'SAFETY', 'PERMIT', 'CONTRACT'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '3px 7px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '10px',
                  fontWeight: selectedCategory === cat ? 700 : 500,
                  backgroundColor: selectedCategory === cat ? '#18181b' : '#f4f4f5',
                  color: selectedCategory === cat ? '#ffffff' : '#71717a',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Document List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filteredDocs.map((doc) => {
            const isSelected = doc.id === selectedDocId;
            const meta = getCategoryMeta(doc.category);
            const Icon = meta.icon;
            const annCount = doc.annotations?.length || 0;

            return (
              <div
                key={doc.id}
                onClick={() => handleSelectDoc(doc.id)}
                style={{
                  padding: '10px 10px',
                  borderRadius: '6px',
                  marginBottom: '6px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#f4f4f5' : '#ffffff',
                  border: isSelected ? '1px solid #d4d4d8' : '1px solid #f4f4f5',
                  transition: 'all 0.1s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Icon size={13} color={meta.color} />
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        color: meta.color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDoc(doc.id);
                    }}
                    className="btn-clean-subtle"
                    style={{ padding: '2px', opacity: 0.6 }}
                    title="Delete document"
                  >
                    <X size={12} />
                  </button>
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#18181b',
                    marginBottom: '4px',
                    lineHeight: '1.3',
                  }}
                >
                  {language === 'ta' && doc.titleTa ? doc.titleTa : doc.title}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10.5px', color: '#a1a1aa' }}>
                  <span>{doc.pageCount} pgs • {doc.fileSize || 'PDF'}</span>
                  {annCount > 0 && (
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        backgroundColor: '#fef3c7',
                        color: '#b45309',
                        padding: '1px 5px',
                        borderRadius: '3px',
                      }}
                    >
                      {annCount} notes
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Area: Document Viewer & Full Annotation Studio */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Annotation Toolbar */}
        <div
          className="no-print"
          style={{
            padding: '8px 16px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e4e4e7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {/* Annotation Tools Segmented Switch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div
              style={{
                display: 'flex',
                backgroundColor: '#f4f4f5',
                borderRadius: '6px',
                padding: '2px',
                gap: '2px',
              }}
            >
              {/* Hand / View Tool */}
              <button
                onClick={() => setActiveTool('hand')}
                style={{
                  padding: '5px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: activeTool === 'hand' ? '#ffffff' : 'transparent',
                  color: activeTool === 'hand' ? '#18181b' : '#71717a',
                  boxShadow: activeTool === 'hand' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Hand / Scroll mode"
              >
                <Hand size={13} />
                <span>View</span>
              </button>

              {/* Highlighter Tool */}
              <button
                onClick={() => {
                  setActiveTool('highlight');
                  setActiveColor('#fde047');
                }}
                style={{
                  padding: '5px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: activeTool === 'highlight' ? '#ffffff' : 'transparent',
                  color: activeTool === 'highlight' ? '#18181b' : '#71717a',
                  boxShadow: activeTool === 'highlight' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title={t.toolHighlight}
              >
                <Highlighter size={13} color="#eab308" />
                <span>Highlight</span>
              </button>

              {/* Pen / Ink Drawing */}
              <button
                onClick={() => {
                  setActiveTool('pen');
                  if (!PEN_COLORS.includes(activeColor)) setActiveColor('#dc2626');
                }}
                style={{
                  padding: '5px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: activeTool === 'pen' ? '#ffffff' : 'transparent',
                  color: activeTool === 'pen' ? '#18181b' : '#71717a',
                  boxShadow: activeTool === 'pen' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title={t.toolPen}
              >
                <PenTool size={13} color="#dc2626" />
                <span>Pen</span>
              </button>

              {/* Frame Box Tool */}
              <button
                onClick={() => {
                  setActiveTool('rect');
                  if (!PEN_COLORS.includes(activeColor)) setActiveColor('#dc2626');
                }}
                style={{
                  padding: '5px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: activeTool === 'rect' ? '#ffffff' : 'transparent',
                  color: activeTool === 'rect' ? '#18181b' : '#71717a',
                  boxShadow: activeTool === 'rect' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title={t.toolRect}
              >
                <Square size={13} />
                <span>Frame Box</span>
              </button>

              {/* Text Box */}
              <button
                onClick={() => {
                  setActiveTool('text');
                  if (!PEN_COLORS.includes(activeColor)) setActiveColor('#18181b');
                }}
                style={{
                  padding: '5px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: activeTool === 'text' ? '#ffffff' : 'transparent',
                  color: activeTool === 'text' ? '#18181b' : '#71717a',
                  boxShadow: activeTool === 'text' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title={t.toolText}
              >
                <Type size={13} />
                <span>Text</span>
              </button>

              {/* Sticky Note */}
              <button
                onClick={() => {
                  setActiveTool('note');
                  setActiveColor('#f59e0b');
                }}
                style={{
                  padding: '5px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: activeTool === 'note' ? '#ffffff' : 'transparent',
                  color: activeTool === 'note' ? '#18181b' : '#71717a',
                  boxShadow: activeTool === 'note' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title={t.toolNote}
              >
                <StickyNote size={13} color="#d97706" />
                <span>Sticky Note</span>
              </button>
            </div>

            {/* Color Palette Switcher */}
            {activeTool !== 'hand' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '6px' }}>
                {(activeTool === 'highlight' ? HIGHLIGHT_COLORS : PEN_COLORS).map((c) => (
                  <button
                    key={c}
                    onClick={() => setActiveColor(c)}
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: c,
                      border: activeColor === c ? '2px solid #18181b' : '1px solid rgba(0,0,0,0.15)',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Center / Right: Page Navigation, Zoom & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Page Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="btn-clean"
                style={{ padding: '3px 6px', opacity: currentPage <= 1 ? 0.3 : 1 }}
                title="Previous page"
              >
                <ChevronLeft size={13} />
              </button>

              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#18181b', padding: '0 4px' }}>
                Page {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="btn-clean"
                style={{ padding: '3px 6px', opacity: currentPage >= totalPages ? 0.3 : 1 }}
                title="Next page"
              >
                <ChevronRight size={13} />
              </button>
            </div>

            {/* Zoom Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <button
                onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
                className="btn-clean-subtle"
                style={{ padding: '3px 5px' }}
                title="Zoom Out"
              >
                <ZoomOut size={12} />
              </button>
              <span style={{ fontSize: '11px', color: '#71717a', width: '38px', textAlign: 'center' }}>
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                className="btn-clean-subtle"
                style={{ padding: '3px 5px' }}
                title="Zoom In"
              >
                <ZoomIn size={12} />
              </button>
            </div>

            {/* Clear Page Annotations */}
            {pageAnnotations.length > 0 && (
              <button
                onClick={handleClearPageAnnotations}
                className="btn-clean-subtle"
                style={{ padding: '4px 8px', fontSize: '11px', color: '#dc2626' }}
                title={t.toolClearAll}
              >
                <Trash2 size={12} />
                <span>Clear ({pageAnnotations.length})</span>
              </button>
            )}

            {/* Print / Download Button */}
            <button
              onClick={() => window.print()}
              className="btn-clean-dark"
              style={{ fontSize: '11.5px', padding: '5px 12px' }}
              title={t.downloadAnnotated}
            >
              <Printer size={12} />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Document Sheet Canvas with High-Precision SVG Annotation Overlay */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            backgroundColor: '#f4f4f5',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: activeTool === 'hand' ? 'default' : 'crosshair',
          }}
        >
          {selectedDoc ? (
            <div
              style={{
                width: `${(800 * zoomLevel) / 100}px`,
                minHeight: `${(1100 * zoomLevel) / 100}px`,
                backgroundColor: '#ffffff',
                borderRadius: '4px',
                border: '1px solid #e4e4e7',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                userSelect: activeTool === 'hand' ? 'auto' : 'none',
              }}
            >
              {/* Document Base Content Layer */}
              <div style={{ width: '100%', height: '100%', flex: 1, pointerEvents: activeTool === 'hand' ? 'auto' : 'none' }}>
                {selectedDoc.pdfDataUrl ? (
                  <iframe
                    src={`${selectedDoc.pdfDataUrl}#page=${currentPage}&toolbar=0&navpanes=0`}
                    title={selectedDoc.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: '1000px',
                      border: 'none',
                    }}
                  />
                ) : (
                  renderBuiltInPageContent(selectedDoc, currentPage)
                )}
              </div>

              {/* Vector SVG Annotation Overlay Layer */}
              <svg
                ref={svgOverlayRef}
                viewBox="0 0 800 1100"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: activeTool === 'hand' ? 'none' : 'auto',
                  zIndex: 20,
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {/* Render Highlights */}
                {pageAnnotations
                  .filter((a) => a.type === 'highlight')
                  .map((a) => (
                    <rect
                      key={a.id}
                      x={a.x}
                      y={a.y}
                      width={a.width}
                      height={a.height}
                      fill={a.color}
                      opacity={a.opacity || 0.38}
                      rx="3"
                    />
                  ))}

                {/* Render Frames / Rectangles */}
                {pageAnnotations
                  .filter((a) => a.type === 'rect')
                  .map((a) => (
                    <rect
                      key={a.id}
                      x={a.x}
                      y={a.y}
                      width={a.width}
                      height={a.height}
                      fill="none"
                      stroke={a.color}
                      strokeWidth={a.strokeWidth || 2}
                      strokeDasharray="4 2"
                      rx="2"
                    />
                  ))}

                {/* Render Freehand Pen Lines */}
                {pageAnnotations
                  .filter((a) => a.type === 'pen' && a.points)
                  .map((a) => {
                    const d = (a.points || []).reduce(
                      (acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
                      ''
                    );
                    return (
                      <path
                        key={a.id}
                        d={d}
                        fill="none"
                        stroke={a.color}
                        strokeWidth={a.strokeWidth || 3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })}

                {/* Active In-Progress Drawing Pen Path */}
                {isDrawing && activeTool === 'pen' && currentPath.length > 1 && (
                  <path
                    d={currentPath.reduce(
                      (acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
                      ''
                    )}
                    fill="none"
                    stroke={activeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Active In-Progress Rectangle */}
                {isDrawing && (activeTool === 'highlight' || activeTool === 'rect') && currentRect && (
                  <rect
                    x={currentRect.x}
                    y={currentRect.y}
                    width={currentRect.width}
                    height={currentRect.height}
                    fill={activeTool === 'highlight' ? activeColor : 'none'}
                    opacity={activeTool === 'highlight' ? 0.38 : 1}
                    stroke={activeTool === 'rect' ? activeColor : 'none'}
                    strokeWidth={strokeWidth}
                    rx="3"
                  />
                )}
              </svg>

              {/* Render HTML Text Labels & Sticky Notes on top */}
              {pageAnnotations
                .filter((a) => a.type === 'text')
                .map((a) => (
                  <div
                    key={a.id}
                    style={{
                      position: 'absolute',
                      left: `${((a.x || 0) / 800) * 100}%`,
                      top: `${((a.y || 0) / 1100) * 100}%`,
                      color: a.color,
                      fontSize: '12px',
                      fontWeight: 800,
                      backgroundColor: 'rgba(255, 255, 255, 0.85)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      border: `1px solid ${a.color}`,
                      zIndex: 30,
                      pointerEvents: 'auto',
                    }}
                  >
                    <span>{a.text}</span>
                    <button
                      onClick={() => handleDeleteAnnotation(a.id)}
                      style={{
                        marginLeft: '6px',
                        background: 'none',
                        border: 'none',
                        color: '#a1a1aa',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

              {/* Render Sticky Notes */}
              {pageAnnotations
                .filter((a) => a.type === 'note')
                .map((a) => (
                  <div
                    key={a.id}
                    style={{
                      position: 'absolute',
                      left: `${((a.x || 0) / 800) * 100}%`,
                      top: `${((a.y || 0) / 1100) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 35,
                      pointerEvents: 'auto',
                    }}
                  >
                    <div
                      onClick={() => setEditingNoteId(editingNoteId === a.id ? null : a.id)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: a.color || '#f59e0b',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        cursor: 'pointer',
                      }}
                      title={a.text}
                    >
                      <MessageSquare size={14} />
                    </div>

                    {/* Expanded Note Card */}
                    {editingNoteId === a.id && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '34px',
                          left: '-100px',
                          width: '220px',
                          backgroundColor: '#ffffff',
                          borderRadius: '6px',
                          border: '1px solid #e4e4e7',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                          padding: '10px 12px',
                          zIndex: 40,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#18181b' }}>
                            {a.author || 'Production Note'}
                          </span>
                          <button
                            onClick={() => handleDeleteAnnotation(a.id)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '11px' }}
                            title="Delete Note"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <p style={{ fontSize: '11.5px', color: '#3f3f46', lineHeight: '1.4', margin: 0 }}>
                          {a.text}
                        </p>
                      </div>
                    )}
                  </div>
                ))}

              {/* Sticky Note Placement Popover Input */}
              {activeNote && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${(activeNote.x / 800) * 100}%`,
                    top: `${(activeNote.y / 1100) * 100}%`,
                    width: '240px',
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    border: '1px solid #18181b',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    padding: '10px 12px',
                    zIndex: 50,
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', color: '#18181b' }}>
                    Add Production Note
                  </div>
                  <textarea
                    autoFocus
                    value={activeNote.text}
                    onChange={(e) => setActiveNote({ ...activeNote, text: e.target.value })}
                    placeholder="Enter staging direction, lighting note, or safety comment..."
                    style={{
                      width: '100%',
                      height: '60px',
                      fontSize: '11.5px',
                      border: '1px solid #e4e4e7',
                      borderRadius: '4px',
                      padding: '6px',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
                    <button
                      onClick={() => setActiveNote(null)}
                      className="btn-clean"
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveStickyNote}
                      className="btn-clean-dark"
                      style={{ fontSize: '11px', padding: '3px 10px' }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: '#a1a1aa', marginTop: '80px', fontSize: '13px' }}>
              {t.noDocsSelected}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
