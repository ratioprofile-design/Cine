import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { askProductionCopilot } from '../services/gemini';
import { Scene } from '../types/production';
import {
  Sparkles,
  Send,
  X,
  User,
  Bot,
  Lightbulb,
} from 'lucide-react';

interface AiCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: Scene[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
}

export const AiCopilotModal: React.FC<AiCopilotModalProps> = ({
  isOpen,
  onClose,
  scenes,
}) => {
  const { t, language } = useLanguage();
  const [inputQuestion, setInputQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-init',
      sender: 'assistant',
      text:
        language === 'ta'
          ? 'வணக்கம்! நான் உங்கள் சினிமா தயாரிப்பு AI உதவியாளர் (Film Copilot). உங்கள் திரைக்கதையின் காட்சி விவரங்கள், சண்டைக்காட்சி பாதுகாப்பு, பட்ஜெட் திட்டமிடல் அல்லது படப்பிடிப்பு வரிசை பற்றி எதை வேண்டுமானாலும் கேளுங்கள்.'
          : 'Hello! I am your CineBreak Production Copilot. Ask me anything about your script: stunt safety protocols, equipment checklists, props logistics, or Kollywood/Hollywood scheduling advice.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (questionText?: string) => {
    const q = (questionText || inputQuestion).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsLoading(true);

    try {
      const answer = await askProductionCopilot(q, scenes, language);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: answer,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'assistant',
          text: `Error connecting to AI: ${err.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: t.quickPromptStunts, prompt: 'List all stunt sequences, wire requirements, and safety protocols for this production.' },
    { label: t.quickPromptNight, prompt: 'Summarize all night exterior lighting setups, generator power needs, and camera rigs required.' },
    { label: t.quickPromptTamilProps, prompt: 'கோவில் திருவிழா மற்றும் சண்டைக்காட்சிகளுக்கு தேவையான அனைத்து விசேஷ பொருட்களையும் பட்டியலிடு.' },
    { label: t.quickPromptSchedule, prompt: 'Suggest an optimized shooting schedule order to minimize location moves and night turnaround fatigue.' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '720px',
          height: '640px',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: '#e0f2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} color="#0284c7" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                {t.copilotTitle}
              </h3>
              <p style={{ fontSize: '11px', color: '#64748b' }}>
                {t.copilotSub}
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

        {/* Quick Prompts Carousel / Pills */}
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p.prompt)}
              disabled={isLoading}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '999px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0f172a';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.color = '#334155';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
            >
              <Lightbulb size={11} color="#b45309" />
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div
          style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backgroundColor: '#f8fafc',
          }}
        >
          {messages.map((m) => {
            const isUser = m.sender === 'user';

            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                {!isUser && (
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#e0f2fe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={15} color="#0284c7" />
                  </div>
                )}

                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: isUser ? '#0f172a' : '#ffffff',
                    color: isUser ? '#ffffff' : '#0f172a',
                    border: isUser ? 'none' : '1px solid #e2e8f0',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    fontWeight: isUser ? 500 : 400,
                  }}
                >
                  {m.text}
                </div>

                {isUser && (
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <User size={15} color="#ffffff" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-start' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#e0f2fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={15} color="#0284c7" />
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  fontSize: '12.5px',
                  fontStyle: 'italic',
                }}
              >
                Analyzing production requirements with Gemini...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ display: 'flex', gap: '10px' }}
          >
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder={t.copilotPlaceholder}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!inputQuestion.trim() || isLoading}
              className="btn-primary"
              style={{ padding: '0 18px', background: '#0284c7', borderColor: '#0284c7' }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
