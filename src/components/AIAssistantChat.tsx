import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ShieldAlert,
  Info,
  Clock,
  Pill,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { User as UserType, AIMessage, Medication, AdherenceSummary, RiskAssessment } from '../types';
import { BackButton } from './BackButton';

interface AIAssistantChatProps {
  patient: UserType;
  medications: Medication[];
  summary: AdherenceSummary;
  riskLevel: RiskAssessment;
  onSendMessage: (message: string) => Promise<{ reply: string }>;
}

export const AIAssistantChat: React.FC<AIAssistantChatProps> = ({
  patient,
  medications,
  summary,
  riskLevel,
  onSendMessage,
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Hello ${patient.name.split(' ')[0]}! I am your CarePulse Personal AI Healthcare Assistant. I have authorized access to your medication schedule (${medications.length} active meds) and adherence summary (${summary.weeklyPercentage}% weekly adherence rate). How can I assist you with your health routine today?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const promptSuggestions = [
    'How many medicines did I miss this week?',
    'Show today\'s medication history.',
    'When did I last take Metformin?',
    'What medicines am I missing most often?',
    'Show my medication timeline.',
    'Why is my risk level calculated as ' + riskLevel.riskLevel + '?',
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputQuery;
    if (!text.trim() || loading) return;

    const userMsg: AIMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await onSendMessage(text);
      const assistantMsg: AIMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: AIMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content:
          'I am currently reviewing your health records. Please check your network connection and try again in a moment.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <BackButton fallbackLabel="Back to Dashboard" />
      </div>

      {/* Header & Context Bar */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Personal AI Healthcare Assistant
              </span>
              <h1 className="text-2xl font-bold text-white mt-1">Context-Aware AI Chat</h1>
              <p className="text-xs text-slate-400">
                Powered by Gemini 3.6 Flash using your authorized health & medication history
              </p>
            </div>
          </div>

          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-xs text-slate-300">
            <div className="font-bold text-white mb-1">Active Patient Context</div>
            <div className="flex items-center space-x-2 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-semibold">
                {medications.length} Meds
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-semibold">
                {summary.weeklyPercentage}% Weekly
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-semibold">
                {riskLevel.riskLevel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Medical AI Disclaimer Banner */}
      <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl text-xs text-slate-700 flex items-start space-x-2.5">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Medical AI Disclaimer:</strong> AI-generated insights are for general informational guidance only and do not replace professional diagnosis, prescription, or clinical advice from a qualified doctor or pharmacist.
        </p>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[550px]">
        {/* Messages Stream */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-900/90">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-blue-400 border border-slate-700'
                }`}
              >
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              <div
                className={`max-w-[82%] sm:max-w-[75%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs'
                    : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-xs'
                }`}
              >
                <p className="whitespace-pre-line">{msg.content}</p>
                <span
                  className={`text-[10px] mt-2 block ${
                    msg.role === 'user' ? 'text-blue-200 text-right' : 'text-slate-400'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-blue-400 flex items-center justify-center font-bold">
                <Bot className="w-5 h-5 animate-spin" />
              </div>
              <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl rounded-tl-xs text-xs text-slate-400 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>Analyzing your authorized medication context & generating response...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-slate-800/80 border-t border-slate-800 flex items-center space-x-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Suggestions:</span>
          {promptSuggestions.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(sug)}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium whitespace-nowrap transition-colors shrink-0"
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask your AI assistant about medications, symptoms, or adherence..."
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || loading}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-colors flex items-center space-x-1 shadow-xs"
          >
            <span>Send</span>
            <Send className="w-4 h-4 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
};
