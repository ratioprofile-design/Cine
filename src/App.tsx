import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { AppSidebar } from './components/AppSidebar';
import { ActiveTab } from './components/NavigationTabs';
import { ScriptViewer } from './components/ScriptViewer';
import { BreakdownSheet } from './components/BreakdownSheet';
import { Stripboard } from './components/Stripboard';
import { DoodMatrix } from './components/DoodMatrix';
import { WhiteboardCanvas } from './components/Whiteboard/Canvas';
import { DocumentVault } from './components/Documents/DocumentVault';
import { ScriptArchiveView } from './components/Archive/ScriptArchiveModal';
import { CallSheetView } from './components/Documents/CallSheetView';

// Modals
import { ImportModal } from './components/ImportModal';
import { TamilTranscoderModal } from './components/TamilTranscoderModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { AiCopilotModal } from './components/AiCopilotModal';

// Types & Services
import { Scene, ScriptVersion, WhiteboardCard, CallSheet, BreakdownItem, RevisionColor, ProductionDocument } from './types/production';
import {
  getScriptVersions,
  saveScriptVersions,
  getActiveVersionId,
  setActiveVersionId,
  getWhiteboardCards,
  saveWhiteboardCards,
  getActiveCallSheet,
  saveActiveCallSheet,
} from './services/storageService';
import { getProductionDocuments, saveProductionDocuments } from './services/documentsStorage';
import { breakdownSceneWithGemini } from './services/gemini';
import { SAMPLE_SCRIPTS } from './services/sampleScripts';
import { parseScreenplay, formatEighths } from './services/scriptParser';

function MainApp() {
  const { language, effectiveBreakdownLang } = useLanguage();

  // Core State
  const [versions, setVersions] = useState<ScriptVersion[]>(() => getScriptVersions());
  const [activeVerId, setActiveVerId] = useState<string>(() => getActiveVersionId());
  const [activeTab, setActiveTab] = useState<ActiveTab>('script');
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);

  // Whiteboard, CallSheet & Production Documents State
  const [whiteboardCards, setWhiteboardCards] = useState<WhiteboardCard[]>(() => getWhiteboardCards());
  const [callSheet, setCallSheet] = useState<CallSheet>(() => getActiveCallSheet());
  const [productionDocs, setProductionDocs] = useState<ProductionDocument[]>(() => getProductionDocuments());

  // Modal States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isTranscoderOpen, setIsTranscoderOpen] = useState(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Active Version and its scenes
  const activeVersion = versions.find((v) => v.id === activeVerId) || versions[0];
  const scenes = activeVersion.scenes || [];

  // Persist versions whenever changed
  useEffect(() => {
    saveScriptVersions(versions);
  }, [versions]);

  useEffect(() => {
    setActiveVersionId(activeVerId);
  }, [activeVerId]);

  // Persist Whiteboard
  const handleUpdateWhiteboardCards = (updated: WhiteboardCard[]) => {
    setWhiteboardCards(updated);
    saveWhiteboardCards(updated);
  };

  // Persist Call Sheet
  const handleUpdateCallSheet = (sheet: CallSheet) => {
    setCallSheet(sheet);
    saveActiveCallSheet(sheet);
  };

  // Persist Production Documents
  const handleUpdateDocuments = (docs: ProductionDocument[]) => {
    setProductionDocs(docs);
    saveProductionDocuments(docs);
  };

  // Update scenes on the active version
  const updateActiveScenes = (newScenes: Scene[]) => {
    setVersions((prev) =>
      prev.map((v) =>
        v.id === activeVerId
          ? {
              ...v,
              scenes: newScenes,
              sceneCount: newScenes.length,
              pageCountEighths: newScenes.reduce((acc, s) => acc + s.pagesEighths, 0),
            }
          : v
      )
    );
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // AI Breakdown for a single scene
  const handleRunAiBreakdown = async (scene: Scene) => {
    setIsAnalyzing(true);
    try {
      const result = await breakdownSceneWithGemini(scene, effectiveBreakdownLang);
      const newItems: BreakdownItem[] = result.items.map((item, idx) => ({
        id: `ai-${Date.now()}-${idx}`,
        category: item.category,
        name: item.name,
        nameTa: item.nameTa || item.name,
        description: item.description,
        descriptionTa: item.descriptionTa,
        count: item.count || 1,
      }));

      const updatedScenes = scenes.map((s) => {
        if (s.id === scene.id) {
          return {
            ...s,
            synopsis: effectiveBreakdownLang === 'ta' && result.synopsisTa ? result.synopsisTa : result.synopsis,
            synopsisTa: result.synopsisTa,
            breakdownItems: newItems.length > 0 ? newItems : s.breakdownItems,
          };
        }
        return s;
      });

      updateActiveScenes(updatedScenes);
      const sIdx = scenes.findIndex((s) => s.id === scene.id);
      if (sIdx !== -1) setSelectedSceneIndex(sIdx);
      setActiveTab('breakdown');
      showToast(
        language === 'ta'
          ? `✨ காட்சி ${scene.sceneNumber}க்கான ${newItems.length} தயாரிப்பு குறிப்புகள் Gemini AI மூலம் வெற்றிகரமாக பிரித்தெடுக்கப்பட்டது!`
          : `✨ Gemini AI extracted ${newItems.length} elements for Scene ${scene.sceneNumber}!`
      );
    } catch (err: any) {
      alert(`AI breakdown error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Add Item to scene
  const handleAddItem = (sceneId: string, item: BreakdownItem) => {
    const updated = scenes.map((s) =>
      s.id === sceneId ? { ...s, breakdownItems: [...s.breakdownItems, item] } : s
    );
    updateActiveScenes(updated);
  };

  // Delete Item from scene
  const handleDeleteItem = (sceneId: string, itemId: string) => {
    const updated = scenes.map((s) =>
      s.id === sceneId
        ? { ...s, breakdownItems: s.breakdownItems.filter((i) => i.id !== itemId) }
        : s
    );
    updateActiveScenes(updated);
  };

  // Reorder Scenes in Stripboard
  const handleReorderScenes = (newScenes: Scene[]) => {
    updateActiveScenes(newScenes);
  };

  // Import Script Success Handler
  const handleImportSuccess = (importedScenes: Scene[], rawScript: string, title?: string) => {
    const newVersion: ScriptVersion = {
      id: `ver-${Date.now()}`,
      versionNumber: versions.length + 1,
      versionName: title || `Imported Draft ${versions.length + 1}`,
      versionNameTa: title || `இறக்குமதி செய்யப்பட்ட பதிப்பு ${versions.length + 1}`,
      revisionColor: 'WHITE',
      status: 'DRAFT',
      author: 'Script Editor',
      createdAt: new Date().toISOString(),
      scriptContent: rawScript,
      sceneCount: importedScenes.length,
      pageCountEighths: importedScenes.reduce((acc, s) => acc + s.pagesEighths, 0),
      scenes: importedScenes,
    };

    setVersions((prev) => [newVersion, ...prev]);
    setActiveVerId(newVersion.id);
    setSelectedSceneIndex(0);
    setActiveTab('script');
  };

  // Toggle sample script between Kollywood Tamil & Hollywood Action
  const handleLoadSample = () => {
    const currentIsTamil = activeVersion.scriptContent.includes('மீனாட்சி அம்மன்');
    const targetSample = currentIsTamil ? SAMPLE_SCRIPTS[1] : SAMPLE_SCRIPTS[0];
    const targetScenes = parseScreenplay(targetSample.rawScript);

    const sampleVersion: ScriptVersion = {
      id: `ver-sample-${Date.now()}`,
      versionNumber: versions.length + 1,
      versionName: targetSample.title,
      versionNameTa: targetSample.titleTa,
      revisionColor: currentIsTamil ? 'BLUE' : 'WHITE',
      status: 'SHOOTING',
      author: currentIsTamil ? 'Director James Vance' : 'இயக்குனர் கே. கார்த்திக்',
      createdAt: new Date().toISOString(),
      scriptContent: targetSample.rawScript,
      sceneCount: targetScenes.length,
      pageCountEighths: targetScenes.reduce((acc, s) => acc + s.pagesEighths, 0),
      scenes: targetScenes,
    };

    setVersions((prev) => [sampleVersion, ...prev]);
    setActiveVerId(sampleVersion.id);
    setSelectedSceneIndex(0);
  };

  // Create New Version from current
  const handleCreateNewVersion = (
    name: string,
    color: RevisionColor,
    status: 'DRAFT' | 'REVISED' | 'LOCKED' | 'SHOOTING'
  ) => {
    const newVer: ScriptVersion = {
      id: `ver-${Date.now()}`,
      versionNumber: versions.length + 1,
      versionName: name,
      versionNameTa: name,
      revisionColor: color,
      status,
      author: activeVersion.author,
      createdAt: new Date().toISOString(),
      scriptContent: activeVersion.scriptContent,
      sceneCount: activeVersion.sceneCount,
      pageCountEighths: activeVersion.pageCountEighths,
      scenes: JSON.parse(JSON.stringify(activeVersion.scenes)),
    };

    setVersions((prev) => [newVer, ...prev]);
    setActiveVerId(newVer.id);
  };

  // Lock / Unlock Version
  const handleToggleLock = (id: string) => {
    setVersions((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, status: v.status === 'LOCKED' ? 'REVISED' : 'LOCKED' } : v
      )
    );
  };

  // Duplicate Version
  const handleDuplicateVersion = (id: string) => {
    const target = versions.find((v) => v.id === id);
    if (!target) return;

    const dup: ScriptVersion = {
      ...target,
      id: `ver-dup-${Date.now()}`,
      versionNumber: versions.length + 1,
      versionName: `${target.versionName} (Copy)`,
      versionNameTa: `${target.versionNameTa} (நகல்)`,
      createdAt: new Date().toISOString(),
      scenes: JSON.parse(JSON.stringify(target.scenes)),
    };

    setVersions((prev) => [dup, ...prev]);
  };

  // Delete Version
  const handleDeleteVersion = (id: string) => {
    if (versions.length <= 1) return;
    const filtered = versions.filter((v) => v.id !== id);
    setVersions(filtered);
    if (activeVerId === id) {
      setActiveVerId(filtered[0].id);
    }
  };

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row', backgroundColor: '#fafafa' }}>
      {/* Left Sidebar containing all app headings & tools with togglable button */}
      <AppSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        projectTitle={language === 'ta' ? activeVersion.versionNameTa : activeVersion.versionName}
        sceneCount={scenes.length}
        formattedPages={formatEighths(scenes.reduce((acc, s) => acc + s.pagesEighths, 0))}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenTranscoder={() => setIsTranscoderOpen(true)}
        onOpenApiKey={() => setIsApiKeyOpen(true)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onLoadSample={handleLoadSample}
      />

      {/* Main View Contents */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        <main style={{ flex: 1, minWidth: 0 }}>
        {activeTab === 'script' && (
          <ScriptViewer
            scenes={scenes}
            selectedSceneIndex={selectedSceneIndex}
            onSelectSceneIndex={setSelectedSceneIndex}
            onNavigateToBreakdown={(sceneId) => {
              const idx = scenes.findIndex((s) => s.id === sceneId);
              if (idx !== -1) setSelectedSceneIndex(idx);
              setActiveTab('breakdown');
            }}
            onRunAiBreakdown={handleRunAiBreakdown}
            onUpdateScenes={updateActiveScenes}
            isAnalyzing={isAnalyzing}
          />
        )}

        {activeTab === 'breakdown' && (
          <BreakdownSheet
            scenes={scenes}
            selectedSceneIndex={selectedSceneIndex}
            onSelectSceneIndex={setSelectedSceneIndex}
            onRunAiBreakdown={handleRunAiBreakdown}
            onAddItem={handleAddItem}
            onDeleteItem={handleDeleteItem}
            isAnalyzing={isAnalyzing}
          />
        )}

        {activeTab === 'stripboard' && (
          <Stripboard
            scenes={scenes}
            onReorderScenes={handleReorderScenes}
            onNavigateToScene={(sceneId) => {
              const idx = scenes.findIndex((s) => s.id === sceneId);
              if (idx !== -1) setSelectedSceneIndex(idx);
              setActiveTab('breakdown');
            }}
          />
        )}

        {activeTab === 'dood' && <DoodMatrix scenes={scenes} />}

        {activeTab === 'whiteboard' && (
          <WhiteboardCanvas
            cards={whiteboardCards}
            onUpdateCards={handleUpdateWhiteboardCards}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentVault
            documents={productionDocs}
            onUpdateDocuments={handleUpdateDocuments}
          />
        )}

        {activeTab === 'archive' && (
          <ScriptArchiveView
            versions={versions}
            activeVersionId={activeVerId}
            onSelectVersion={setActiveVerId}
            onCreateNewVersion={handleCreateNewVersion}
            onToggleLock={handleToggleLock}
            onDuplicateVersion={handleDuplicateVersion}
            onDeleteVersion={handleDeleteVersion}
          />
        )}

        {activeTab === 'callsheet' && (
          <CallSheetView
            callSheet={callSheet}
            scenes={scenes}
            onUpdateCallSheet={handleUpdateCallSheet}
          />
        )}
        </main>
      </div>

      {/* Modals */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      <TamilTranscoderModal
        isOpen={isTranscoderOpen}
        onClose={() => setIsTranscoderOpen(false)}
        onApplyScript={(importedScenes, rawText) => {
          handleImportSuccess(importedScenes, rawText, 'Transcoded Tamil Script');
        }}
      />

      <ApiKeyModal
        isOpen={isApiKeyOpen}
        onClose={() => setIsApiKeyOpen(false)}
      />

      <AiCopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        scenes={scenes}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#18181b',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: 500,
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <MainApp />
    </LanguageProvider>
  );
}
