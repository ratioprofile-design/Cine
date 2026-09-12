import React, { useState, useRef, useEffect } from 'react';
import { Scene } from '../types/production';
import { useLanguage } from '../i18n/LanguageContext';
import { executeScriptAgentCommand, AgentExecutionResult, ViewSettings } from '../services/scriptAgent';
import {
  Sparkles,
  Send,
  X,
  Undo2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Compass,
  Scissors,
  Edit3,
  Layers,
  FileText,
  Sliders,
  Maximize2,
  Minimize2,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface ScriptAiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: Scene[];
  selectedSceneIndex: number;
  onSelectSceneIndex: (idx: number) => void;
  onNavigateToPage: (pageIndex: number) => void;
  onUpdateScenes: (newScenes: Scene[]) => void;
  viewSettings: ViewSettings;
  onUpdateViewSettings: (newSettings: ViewSettings) => void;
}

interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  result?: AgentExecutionResult;
  timestamp: string;
}

export const ScriptAiAssistant: React.FC<ScriptAiAssistantProps> = ({
  isOpen,
  onClose,
  scenes,
  selectedSceneIndex,
  onSelectSceneIndex,
  onNavigateToPage,
  onUpdateScenes,
  viewSettings,
  onUpdateViewSettings,
}) => {
  const { language } = useLanguage();
  const isTamil = language === 'ta';

  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'quickActions'>('chat');

  const currentScene = scenes[selectedSceneIndex] || scenes[0];

  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: isTamil
        ? `வணக்கம்! நான் உங்கள் திரைக்கதை வாசிப்பு AI உதவியாளர் (Script Agent). காட்சிகளை மாற்ற, தாவ, வசனங்களை திருத்த, பொருட்களை சேர்க்க அல்லது ஜூம் அளவை மாற்ற என்னிடம் கேளுங்கள். நான் உடனே செய்து தருகிறேன்!`
        : `Hello! I am your Script Reading AI Assistant. Ask me to jump to any scene/page, edit scene metadata, split or merge scenes, add breakdown items, polish dialogues, or adjust viewer formatting — I will do it for you immediately!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  if (!isOpen) return null;

  const handleExecute = async (customPrompt?: string) => {
    const prompt = (customPrompt || inputPrompt).trim();
    if (!prompt || isProcessing) return;

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsProcessing(true);

    try {
      const result = await executeScriptAgentCommand(
        prompt,
        selectedSceneIndex,
        scenes,
        viewSettings,
        language
      );

      // Execute live side-effects directly
      if (result.updatedScenes) {
        onUpdateScenes(result.updatedScenes);
      }
      if (result.targetSceneIndex !== undefined && result.targetSceneIndex >= 0) {
        onSelectSceneIndex(result.targetSceneIndex);
      }
      if (result.targetPageIndex !== undefined && result.targetPageIndex >= 0) {
        onNavigateToPage(result.targetPageIndex);
      }
      if (result.updatedViewSettings) {
        onUpdateViewSettings(result.updatedViewSettings);
      }

      const botMsg: AssistantMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: result.summary,
        result: result,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'assistant',
          text: isTamil
            ? `மன்னிக்கவும், செயலாக்குவதில் பிழை: ${err.message}`
            : `Sorry, error executing command: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndo = (msg: AssistantMessage) => {
    if (msg.result?.previousScenes) {
      onUpdateScenes(msg.result.previousScenes);
      setMessages((prev) => [
        ...prev,
        {
          id: `undo-${Date.now()}`,
          sender: 'assistant',
          text: isTamil
            ? `↩️ முந்தைய திரைக்கதை மாற்றங்கள் வெற்றிகரமாக மீட்டெடுக்கப்பட்டன.`
            : `↩️ Previous script changes have been undone successfully.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const quickActionPills = [
    {
      category: isTamil ? 'திரைக்கதை திருத்தம்' : 'Quick Edits',
      items: [
        { label: isTamil ? 'நேரத்தை இரவாக மாற்று' : 'Make current scene NIGHT', prompt: `Change scene ${currentScene?.sceneNumber || '1'} time of day to NIGHT` },
        { label: isTamil ? 'துப்பாக்கி மற்றும் காரை சேர்க்கவும்' : 'Add Gun & Black Car to Props', prompt: `Add a Black Revolver to Props and 1 Black SUV to Vehicles in scene ${currentScene?.sceneNumber || '1'}` },
        { label: isTamil ? 'காட்சிகளை 1..N என வரிசைப்படுத்து' : 'Renumber All Scenes 1..N', prompt: 'Renumber all scenes sequentially' },
        { label: isTamil ? 'இக்காட்சியை இரண்டாகப் பிரி' : 'Split current scene', prompt: `Split scene ${currentScene?.sceneNumber || '1'} into two scenes` },
      ],
    },
    {
      category: isTamil ? 'தாவல் & பார்வை' : 'Navigation & Views',
      items: [
        { label: isTamil ? 'பக்கம் 2க்கு செல்' : 'Jump to Page 2', prompt: 'Go to page 2' },
        { label: isTamil ? 'அடுத்த காட்சிக்கு செல்' : 'Jump to Next Scene', prompt: `Jump to scene ${Math.min(scenes.length, (Number(currentScene?.sceneNumber) || 1) + 1)}` },
        { label: isTamil ? 'எழுத்து அளவு 16pt & ஜூம் 120%' : 'Font 16pt & Zoom 120%', prompt: 'Set font size to 16pt and zoom to 120%' },
        { label: isTamil ? 'தனிப் பக்க பார்வைக்கு மாற்று' : 'Switch to Single Page View', prompt: 'Switch to single page view mode' },
      ],
    },
    {
      category: isTamil ? 'வசனம் & மொழிபெயர்ப்பு' : 'Creative & Dialogue',
      items: [
        { label: isTamil ? 'வசனத்தை மேலும் தீவிரமாக்கு' : 'Make dialogue more intense', prompt: `Rewrite and polish dialogues in scene ${currentScene?.sceneNumber || '1'} to be more gripping and cinematic` },
        { label: isTamil ? 'இக்காட்சியை தமிழுக்கு மாற்று' : 'Translate scene to Tamil', prompt: `Translate scene ${currentScene?.sceneNumber || '1'} details and metadata to Tamil` },
        { label: isTamil ? 'புதிய சேஸிங் காட்சியைச் சேர்க்க' : 'Add new INT. CHASE scene', prompt: `Insert a new scene after scene ${currentScene?.sceneNumber || '1'}: EXT. HIGHWAY - NIGHT with high-speed car chase action` },
      ],
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: '64px',
        right: '16px',
        bottom: '24px',
        width: isExpanded ? '540px' : '380px',
        maxWidth: 'calc(100vw - 32px)',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2), 0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #cbd5e1',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 500,
        overflow: 'hidden',
        transition: 'width 0.2s ease-in-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'rgba(56, 189, 248, 0.2)',
              border: '1px solid rgba(56, 189, 248, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={16} color="#38bdf8" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{isTamil ? 'AI திரைக்கதை உதவியாளர்' : 'AI Script Assistant'}</span>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  backgroundColor: '#0284c7',
                  padding: '1px 5px',
                  borderRadius: '10px',
                  color: '#ffffff',
                  textTransform: 'uppercase',
                }}
              >
                Agent
              </span>
            </div>
            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
              {isTamil
                ? `காட்சி ${currentScene?.sceneNumber || '1'} (${currentScene?.location || ''}) தேர்வு செய்யப்பட்டுள்ளது`
                : `Active: Sc. ${currentScene?.sceneNumber || '1'} (${currentScene?.location || ''})`}
            </div>
          </div>
        </div>

        {/* Window controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
            }}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
            }}
            title="Close Assistant"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          padding: '0 8px',
        }}
      >
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            borderBottom: activeTab === 'chat' ? '2px solid #0284c7' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'chat' ? '#0f172a' : '#64748b',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <FileText size={13} />
          <span>{isTamil ? 'உரையாடல் & கட்டளைகள்' : 'Commands & Chat'}</span>
        </button>
        <button
          onClick={() => setActiveTab('quickActions')}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            borderBottom: activeTab === 'quickActions' ? '2px solid #0284c7' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'quickActions' ? '#0f172a' : '#64748b',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Zap size={13} color="#f59e0b" />
          <span>{isTamil ? 'விரைவு செயல்பாடுகள்' : 'Quick Actions'}</span>
        </button>
      </div>

      {/* Main Body */}
      {activeTab === 'chat' ? (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#f8fafc',
          }}
        >
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            const hasUndo = m.result?.canUndo && m.result.previousScenes;

            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '92%',
                }}
              >
                {/* Action Badge if Executed */}
                {!isUser && m.result?.badgeTitle && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        backgroundColor: m.result.status === 'SUCCESS' ? '#dcfce7' : '#e0f2fe',
                        color: m.result.status === 'SUCCESS' ? '#15803d' : '#0369a1',
                        border: `1px solid ${m.result.status === 'SUCCESS' ? '#86efac' : '#bae6fd'}`,
                        borderRadius: '4px',
                        padding: '1px 6px',
                      }}
                    >
                      {m.result.status === 'SUCCESS' ? <CheckCircle2 size={10} /> : <Sparkles size={10} />}
                      <span>{m.result.badgeTitle}</span>
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    backgroundColor: isUser ? '#0f172a' : '#ffffff',
                    color: isUser ? '#ffffff' : '#0f172a',
                    border: isUser ? 'none' : '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    lineHeight: '1.55',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>

                  {/* Optional Detailed Explanation */}
                  {m.result?.explanation && (
                    <div
                      style={{
                        marginTop: '8px',
                        paddingTop: '6px',
                        borderTop: '1px dashed #e2e8f0',
                        fontSize: '11.5px',
                        color: isUser ? '#cbd5e1' : '#475569',
                      }}
                    >
                      {m.result.explanation}
                    </div>
                  )}

                  {/* Undo Button */}
                  {hasUndo && (
                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleUndo(m)}
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title="Revert these script changes"
                      >
                        <Undo2 size={11} />
                        <span>{isTamil ? 'மாற்றத்தை ரத்து செய் (Undo)' : 'Undo Action'}</span>
                      </button>
                    </div>
                  )}
                </div>

                <span
                  style={{
                    fontSize: '9.5px',
                    color: '#94a3b8',
                    marginTop: '2px',
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  {m.timestamp}
                </span>
              </div>
            );
          })}

          {isProcessing && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                alignSelf: 'flex-start',
                color: '#64748b',
                fontSize: '12px',
                fontStyle: 'italic',
              }}
            >
              <RefreshCw size={13} className="animate-spin" color="#0284c7" />
              <span>{isTamil ? 'கட்டளையை செயல்படுத்தி வருகிறது...' : 'Executing agent directive...'}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      ) : (
        /* Quick Actions Panel */
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backgroundColor: '#f8fafc',
          }}
        >
          {quickActionPills.map((group, gIdx) => (
            <div key={gIdx}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                {group.category}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {group.items.map((item, iIdx) => (
                  <button
                    key={iIdx}
                    onClick={() => {
                      setActiveTab('chat');
                      handleExecute(item.prompt);
                    }}
                    disabled={isProcessing}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                      e.currentTarget.style.borderColor = '#0284c7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                  >
                    <span>{item.label}</span>
                    <Zap size={12} color="#0284c7" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input Form */}
      <div
        style={{
          padding: '12px',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #cbd5e1',
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecute();
          }}
          style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder={
              isTamil
                ? 'எ.கா: "காட்சி 2க்கு செல்", "நேரத்தை இரவாக மாற்று", "2 கார்களை சேர்க்க"...'
                : 'e.g. "Jump to sc 2", "Change time to NIGHT", "Add prop Gun"...'
            }
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px',
              outline: 'none',
              color: '#0f172a',
            }}
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isProcessing}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '9px 14px',
              cursor: !inputPrompt.trim() || isProcessing ? 'not-allowed' : 'pointer',
              opacity: !inputPrompt.trim() || isProcessing ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Send size={14} />
          </button>
        </form>
        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', textAlign: 'center' }}>
          {isTamil
            ? 'திரைக்கதையில் எதை செய்ய வேண்டுமானாலும் தட்டச்சு செய்யுங்கள் (தமிழ் / English).'
            : 'Ask in English or Tamil to autonomously execute screenplay edits & navigation.'}
        </div>
      </div>
    </div>
  );
};
