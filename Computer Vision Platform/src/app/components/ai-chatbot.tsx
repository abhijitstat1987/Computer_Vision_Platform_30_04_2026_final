import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BASE_URL } from '../../services/api';
import {
  Bot, Send, Trash2, Plus, Loader2, MessageSquare, Settings2,
  Sparkles, Brain, Clock, ChevronDown, Copy, Check, RefreshCw,
  Zap, Globe, Server, Key, X, Info, AlertCircle,
} from 'lucide-react';

/* ───── Types ───── */
interface ChatMessage {
  id: number;
  sessionId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

interface ChatSession {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface LLMProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
  models: string[];
  requiresKey: boolean;
  defaultModel: string;
  color: string;
}

const LLM_PROVIDERS: LLMProvider[] = [
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    icon: <Server className="w-4 h-4" />,
    models: ['llama3', 'llama3.1', 'llama3.2', 'mistral', 'mixtral', 'gemma2', 'phi3', 'qwen2', 'codellama', 'deepseek-coder'],
    requiresKey: false,
    defaultModel: 'llama3',
    color: 'text-emerald-600',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: <Zap className="w-4 h-4" />,
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-mini', 'o1-preview'],
    requiresKey: true,
    defaultModel: 'gpt-4o-mini',
    color: 'text-sky-600',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: <Brain className="w-4 h-4" />,
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
    requiresKey: true,
    defaultModel: 'claude-3-haiku-20240307',
    color: 'text-orange-600',
  },
];

/* ───── Markdown renderer ───── */
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactElement[] = [];
  let inCode = false;
  let codeBlock: string[] = [];
  let codeLang = '';

  lines.forEach((line, i) => {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        elements.push(
          <div key={`code-${i}`} className="my-2 rounded-lg overflow-hidden border border-slate-200">
            {codeLang && (
              <div className="bg-slate-800 text-slate-400 text-xs px-3 py-1.5 font-mono">{codeLang}</div>
            )}
            <pre className="bg-slate-900 text-green-300 p-4 text-sm overflow-x-auto font-mono">
              {codeBlock.join('\n')}
            </pre>
          </div>
        );
        codeBlock = [];
        codeLang = '';
        inCode = false;
      } else {
        codeLang = line.trim().slice(3);
        inCode = true;
      }
      return;
    }
    if (inCode) { codeBlock.push(line); return; }
    if (!line.trim()) { elements.push(<div key={i} className="h-2" />); return; }

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-base font-bold mt-3 mb-1 text-slate-800">{renderInline(line.slice(4))}</h3>);
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-bold mt-3 mb-1 text-slate-900">{renderInline(line.slice(3))}</h2>);
      return;
    }
    if (line.trim() === '---') {
      elements.push(<hr key={i} className="my-3 border-slate-200" />);
      return;
    }
    if (line.match(/^[-•*] /)) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2 text-base leading-relaxed">
          <span className="text-sky-500 mt-0.5">•</span>
          <span>{renderInline(line.replace(/^[-•*] /, ''))}</span>
        </div>
      );
      return;
    }
    if (line.match(/^\d+\. /)) {
      const match = line.match(/^(\d+)\. (.*)$/);
      if (match) {
        elements.push(
            <div key={i} className="flex gap-2 ml-2 text-base leading-relaxed">
            <span className="font-semibold text-sky-600 mt-0.5">{match[1]}.</span>
            <span>{renderInline(match[2])}</span>
          </div>
        );
        return;
      }
    }
    elements.push(<p key={i} className="text-base leading-relaxed">{renderInline(line)}</p>);
  });
  return <>{elements}</>;
}

function renderInline(text: string): (string | React.ReactElement)[] {
  const parts: (string | React.ReactElement)[] = [];
  const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match;
  let k = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1]) {
      parts.push(<strong key={`b-${k++}`} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(
        <code key={`c-${k++}`} className="bg-slate-100 px-1.5 py-0.5 rounded text-sm text-sky-700 font-mono">
          {match[4]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

/* ───── Main Component ───── */
export function AIChatbot() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // LLM settings
  const [provider, setProvider] = useState('ollama');
  const [model, setModel] = useState('llama3');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [showKey, setShowKey] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentProvider = LLM_PROVIDERS.find(p => p.id === provider)!;

  // Load sessions on mount
  useEffect(() => { loadSessions(); }, []);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when session changes
  useEffect(() => {
    if (activeSession) inputRef.current?.focus();
  }, [activeSession]);

  const loadSessions = async () => {
    try {
      const r = await fetch(`${BASE_URL}/api/chat/sessions`);
      const j = await r.json();
      if (j.success) setSessions(j.data || []);
    } catch { /* ignore */ }
  };

  const loadMessages = async (sessionId: number) => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/chat/sessions/${sessionId}/messages`);
      const j = await r.json();
      if (j.success) {
        setActiveSession(j.data.session);
        setMessages(j.data.messages || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const createSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${BASE_URL}/api/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      const j = await r.json();
      if (j.success) {
        setActiveSession(j.data);
        setMessages([]);
        loadSessions();
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const deleteSession = async (id: number) => {
    try {
      await fetch(`${BASE_URL}/api/chat/sessions/${id}`, { method: 'DELETE' });
      if (activeSession?.id === id) {
        setActiveSession(null);
        setMessages([]);
      }
      loadSessions();
    } catch { /* ignore */ }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeSession || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    setError(null);

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      sessionId: activeSession.id,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const body: Record<string, any> = {
        content: text,
        provider,
        model,
      };
      if (apiKey) body.api_key = apiKey;
      if (baseUrl) body.base_url = baseUrl;

      const r = await fetch(`${BASE_URL}/api/chat/sessions/${activeSession.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();

      if (j.success) {
        // Replace optimistic message with real ones
        setMessages(prev => {
          const without = prev.filter(m => m.id !== tempUserMsg.id);
          return [...without, j.data.userMessage, j.data.assistantMessage];
        });
        // Update session title
        if (j.data.userMessage && activeSession.title === 'New Chat') {
          setActiveSession(prev => prev ? { ...prev, title: text.slice(0, 80) } : prev);
        }
        loadSessions();
      } else {
        setError(j.message || 'Failed to get response');
        // Remove optimistic message
        setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    } catch {
      return '';
    }
  };

  return (
    <div className="h-[calc(100vh-84px)] flex bg-gray-50">
      {/* ── Sessions Sidebar ── */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <button onClick={createSession}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0c4a6e] to-[#0ea5e9] text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all">
            <Plus className="w-5 h-5" /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 && (
            <div className="text-center text-sm text-gray-400 mt-10">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No conversations yet
            </div>
          )}
          {sessions.map(s => (
            <div
              key={s.id}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                activeSession?.id === s.id
                  ? 'bg-sky-50 border border-sky-200 shadow-sm'
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
              onClick={() => loadMessages(s.id)}
            >
              <MessageSquare className={`w-4 h-4 flex-shrink-0 ${
                activeSession?.id === s.id ? 'text-sky-600' : 'text-gray-400'
              }`} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${
                  activeSession?.id === s.id ? 'text-sky-900' : 'text-gray-700'
                }`}>
                  {s.title}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {formatTime(s.updatedAt)}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* LLM Provider Badge */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-slate-50 to-sky-50/50 rounded-lg border border-slate-200 hover:border-sky-300 transition-all text-left"
          >
            <div className={`${currentProvider.color}`}>{currentProvider.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-700">{currentProvider.name}</div>
              <div className="text-xs text-slate-400 truncate">{model}</div>
            </div>
            <Settings2 className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col relative">
        {/* Settings panel overlay */}
        {showSettings && (
          <div className="absolute inset-0 z-20 bg-black/20 flex items-start justify-center pt-16">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[480px] max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-sky-600" />
                  <h3 className="font-bold text-slate-800">LLM Configuration</h3>
                </div>
                <button onClick={() => setShowSettings(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Provider selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Provider</label>
                  <div className="grid grid-cols-3 gap-2">
                    {LLM_PROVIDERS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setProvider(p.id); setModel(p.defaultModel); }}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                          provider === p.id
                            ? 'border-sky-500 bg-sky-50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className={provider === p.id ? 'text-sky-600' : 'text-slate-400'}>{p.icon}</div>
                        <span className={`text-sm font-medium ${provider === p.id ? 'text-sky-700' : 'text-slate-600'}`}>
                          {p.name.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">Model</label>
                  <select
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
                  >
                    {currentProvider.models.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    placeholder="Or type custom model name..."
                    className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-slate-50 text-slate-600"
                  />
                </div>

                {/* API Key */}
                {currentProvider.requiresKey && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                      <Key className="w-3.5 h-3.5 inline mr-1" />
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder={`Enter ${currentProvider.name} API key...`}
                        className="w-full px-3 py-2.5 pr-16 border border-slate-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-mono"
                      />
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-sky-600 hover:text-sky-800 font-medium"
                      >
                        {showKey ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      Key is never stored — only used for this session
                    </p>
                  </div>
                )}

                {/* Base URL (for Ollama) */}
                {provider === 'ollama' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                      <Globe className="w-3.5 h-3.5 inline mr-1" />
                      Ollama URL (optional)
                    </label>
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={e => setBaseUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  </div>
                )}

                <div className="bg-sky-50 rounded-lg p-3 border border-sky-100">
                  <div className="flex items-center gap-2 text-sm font-semibold text-sky-800 mb-1">
                    <Sparkles className="w-4 h-4" />
                    Platform-Aware AI
                  </div>
                  <p className="text-xs text-sky-700 leading-relaxed">
                    The chatbot automatically injects live platform data (cameras, alerts, detections,
                    training jobs, datasets) into every conversation for context-aware responses.
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100">
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full py-3 bg-gradient-to-r from-sky-600 to-cyan-600 text-white rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all"
                >
                  Apply Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No session selected */}
        {!activeSession ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-100 to-cyan-100 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-sky-100">
                <Bot className="w-10 h-10 text-sky-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">AI Platform Assistant</h2>
              <p className="text-base text-slate-500 mb-6 leading-relaxed">
                Ask questions about your vision platform — cameras, detections, alerts,
                training jobs, datasets, and more. The AI has live access to your platform data.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { icon: <MessageSquare className="w-4 h-4" />, text: 'Ask about platform status' },
                  { icon: <Brain className="w-4 h-4" />, text: 'Get detection insights' },
                  { icon: <Sparkles className="w-4 h-4" />, text: 'Training recommendations' },
                  { icon: <Globe className="w-4 h-4" />, text: 'Troubleshoot issues' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-3 rounded-lg bg-white border border-slate-200 text-sm text-slate-600">
                    <span className="text-sky-500">{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
              <button
                onClick={createSession}
                className="px-8 py-3 bg-gradient-to-r from-[#0c4a6e] to-[#0ea5e9] text-white rounded-xl font-semibold text-base shadow-xl hover:shadow-2xl transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Start New Conversation
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-sm">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 text-base">{activeSession.title}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className={`${currentProvider.color} font-medium`}>{currentProvider.name}</span>
                  <span>•</span>
                  <span className="font-mono">{model}</span>
                  <span>•</span>
                  <span>Platform-aware</span>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                title="LLM Settings"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.length === 0 && !loading && (
                <div className="text-center mt-20">
                  <Sparkles className="w-8 h-8 text-sky-300 mx-auto mb-3" />
                  <p className="text-base text-slate-400">Start a conversation — I have live access to your platform data!</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {[
                      'How many cameras are active?',
                      'Show me today\'s detection summary',
                      'What alerts need attention?',
                      'How are my training jobs doing?',
                    ].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(q); }}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-sky-600 to-cyan-600 text-white shadow-lg shadow-sky-200/50'
                        : 'bg-white border border-slate-200 text-slate-700 shadow-sm'
                    }`}
                  >
                    <div className={msg.role === 'user' ? 'text-base leading-relaxed' : ''}>
                      {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                    </div>
                    <div className={`flex items-center gap-2 mt-2 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-between'
                    }`}>
                      <span className={`text-xs ${msg.role === 'user' ? 'text-white/60' : 'text-slate-400'}`}>
                        {formatTime(msg.createdAt)}
                      </span>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-slate-600"
                          title="Copy"
                        >
                          {copiedId === msg.id
                            ? <Check className="w-3 h-3 text-emerald-500" />
                            : <Copy className="w-3 h-3" />
                          }
                        </button>
                      )}
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                      <span className="text-sm text-white font-bold">U</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {sending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <div className="bg-white border-t border-slate-200 px-6 py-4 flex-shrink-0">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your platform — cameras, detections, alerts, models..."
                    rows={1}
                    className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none bg-slate-50 placeholder-slate-400"
                    style={{ minHeight: 44, maxHeight: 120 }}
                    onInput={e => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = 'auto';
                      t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                    }}
                    disabled={sending}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="p-3 bg-gradient-to-r from-sky-600 to-cyan-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100"
                >
                  {sending
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <Send className="w-5 h-5" />
                  }
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-400">
                  Press Enter to send · Shift+Enter for new line
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live platform context injected
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
