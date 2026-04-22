import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BASE_URL } from '../../services/api';
import {
  Bot, Send, Upload, Trash2, Plus, CheckCircle, AlertTriangle,
  Loader2, ChevronRight, ExternalLink, Image, Play, Sparkles,
  Zap, ArrowRight, RefreshCw, Eye, Database, Camera, Cpu, Brain,
  FolderOpen, Tag, Rocket, BarChart3, Settings, ToggleLeft, ToggleRight,
  MessageSquare, Wifi, WifiOff,
} from 'lucide-react';

/* ───── LLM Provider Config ───── */
const LLM_PROVIDERS = [
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    icon: '🦙',
    models: ['llama3', 'llama3.1', 'mistral', 'mixtral', 'phi3', 'gemma2', 'qwen2', 'codellama', 'llava'],
    requiresKey: false,
    description: 'Run models locally — free & private',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    requiresKey: true,
    description: 'Powerful cloud models',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🧠',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
    requiresKey: true,
    description: 'Advanced reasoning',
  },
];

/* ───── Types ───── */
interface AgentStep {
  id: number;
  sessionId: number;
  stepOrder: number;
  phase: string;
  role: 'agent' | 'user' | 'system';
  content: string;
  stepType: 'message' | 'question' | 'action' | 'snapshot' | 'result' | 'error' | 'review' | 'link';
  metadata: Record<string, any>;
  snapshotUrl?: string;
  status: string;
  createdAt: string;
}

interface AgentSessionData {
  id: number;
  title: string;
  status: string;
  projectId?: number;
  useCaseId?: number;
  datasetId?: number;
  trainingJobId?: number;
  config: Record<string, any>;
  currentPhase: string;
  steps: AgentStep[];
  createdAt: string;
  updatedAt: string;
}

/* ───── Phase config for progress tracker ───── */
const PHASE_ICONS: Record<string, any> = {
  welcome: Sparkles,
  project_info: FolderOpen,
  geography: BarChart3,
  use_case: Tag,
  data_storage: Database,
  edge_device: Cpu,
  camera_setup: Camera,
  llm_config: Brain,
  dataset_setup: Image,
  review: Eye,
  create_project: Rocket,
  create_use_case: Tag,
  create_dataset: Image,
  create_camera: Camera,
  create_edge_device: Cpu,
  create_db_config: Database,
  create_llm_config: Brain,
  completed: CheckCircle,
};

const PHASE_LABELS: Record<string, string> = {
  welcome: 'Project Name',
  project_info: 'Organization',
  geography: 'Geography',
  use_case: 'Use Case',
  data_storage: 'Data Storage',
  edge_device: 'Edge Device',
  camera_setup: 'Camera',
  llm_config: 'LLM/SLM',
  dataset_setup: 'Dataset',
  review: 'Review',
  create_project: 'Creating...',
  completed: 'Done!',
};

const GATHERING_PHASES = ['welcome', 'project_info', 'geography', 'use_case',
  'data_storage', 'edge_device', 'camera_setup', 'llm_config', 'dataset_setup', 'review'];

/* ───── Markdown-ish renderer ───── */
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactElement[] = [];
  let inCode = false;
  let codeBlock: string[] = [];

  lines.forEach((line, i) => {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        elements.push(
          <pre key={`code-${i}`} className="bg-gray-900 text-green-300 rounded-lg p-4 text-sm overflow-x-auto my-2 font-mono">
            {codeBlock.join('\n')}
          </pre>
        );
        codeBlock = [];
        inCode = false;
      } else {
        inCode = true;
      }
      return;
    }
    if (inCode) { codeBlock.push(line); return; }
    if (!line.trim()) { elements.push(<div key={i} className="h-2" />); return; }

    // Headers
    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-bold mt-3 mb-1">{renderInline(line.slice(3))}</h2>);
      return;
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-base font-bold mt-2 mb-0.5 text-gray-700">{renderInline(line.slice(4))}</h3>);
      return;
    }

    // HR
    if (line.trim() === '---') {
      elements.push(<hr key={i} className="my-3 border-gray-200" />);
      return;
    }

    // List items
    if (line.match(/^[-•] /)) {
      elements.push(<div key={i} className="flex gap-2 ml-2 text-base"><span>•</span><span>{renderInline(line.slice(2))}</span></div>);
      return;
    }
    if (line.match(/^\d+\. /)) {
      const match = line.match(/^(\d+)\. (.*)$/);
      if (match) {
        elements.push(<div key={i} className="flex gap-2 ml-2 text-base"><span className="font-semibold text-sky-600">{match[1]}.</span><span>{renderInline(match[2])}</span></div>);
        return;
      }
    }

    elements.push(<p key={i} className="text-base">{renderInline(line)}</p>);
  });

  return <>{elements}</>;
}

function renderInline(text: string): (string | React.ReactElement)[] {
  const parts: (string | React.ReactElement)[] = [];
  // Process **bold**, [links](/path), and `code`
  const regex = /(\*\*(.+?)\*\*)|(\[(.+?)\]\((.+?)\))|(`(.+?)`)/g;
  let lastIndex = 0;
  let match;
  let keyIdx = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={`b-${keyIdx++}`}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(
        <Link key={`l-${keyIdx++}`} to={match[5]} className="text-sky-600 hover:text-sky-800 underline inline-flex items-center gap-0.5">
          {match[4]} <ExternalLink className="w-3 h-3" />
        </Link>
      );
    } else if (match[6]) {
      parts.push(<code key={`c-${keyIdx++}`} className="bg-slate-100 px-1.5 py-0.5 rounded text-sm text-sky-700 font-mono">{match[7]}</code>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

/* ───── Main Component ───── */
export function AgentBuilder() {
  const [sessions, setSessions] = useState<AgentSessionData[]>([]);
  const [activeSession, setActiveSession] = useState<AgentSessionData | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showLLMSettings, setShowLLMSettings] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // LLM settings state
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [llmProvider, setLlmProvider] = useState('ollama');
  const [llmModel, setLlmModel] = useState('llama3');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmBaseUrl, setLlmBaseUrl] = useState('');

  // Load sessions
  useEffect(() => {
    loadSessions();
  }, []);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.steps]);

  const loadSessions = async () => {
    try {
      const r = await fetch(`${BASE_URL}/api/agent/sessions`);
      const j = await r.json();
      if (j.success) setSessions(j.data || []);
    } catch { /* ignore */ }
  };

  const loadSession = async (id: number) => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/agent/sessions/${id}`);
      const j = await r.json();
      if (j.success) {
        setActiveSession(j.data);
        // Restore LLM settings from session config
        const cfg = j.data.config || {};
        setLlmEnabled(cfg.agent_llm_enabled || false);
        setLlmProvider(cfg.agent_llm_provider || 'ollama');
        setLlmModel(cfg.agent_llm_model || 'llama3');
        setLlmApiKey(cfg.agent_llm_api_key || '');
        setLlmBaseUrl(cfg.agent_llm_base_url || '');
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const createSession = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/agent/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'AI Agent Project Builder',
          llm_enabled: llmEnabled,
          llm_provider: llmProvider,
          llm_model: llmModel,
          llm_api_key: llmApiKey || undefined,
          llm_base_url: llmBaseUrl || undefined,
        }),
      });
      const j = await r.json();
      if (j.success) {
        setActiveSession(j.data);
        loadSessions();
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const deleteSession = async (id: number) => {
    try {
      await fetch(`${BASE_URL}/api/agent/sessions/${id}`, { method: 'DELETE' });
      if (activeSession?.id === id) setActiveSession(null);
      loadSessions();
    } catch { /* ignore */ }
  };

  const sendResponse = async () => {
    if (!input.trim() || !activeSession || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    // Optimistic: show user message immediately
    setActiveSession(prev => prev ? {
      ...prev,
      steps: [...prev.steps, {
        id: Date.now(),
        sessionId: prev.id,
        stepOrder: prev.steps.length,
        phase: prev.currentPhase,
        role: 'user',
        content: text,
        stepType: 'message',
        metadata: {},
        status: 'completed',
        createdAt: new Date().toISOString(),
      }],
    } : null);

    try {
      // Use free chat endpoint for completed sessions, respond endpoint for gathering
      const endpoint = isCompleted
        ? `${BASE_URL}/api/agent/sessions/${activeSession.id}/chat`
        : `${BASE_URL}/api/agent/sessions/${activeSession.id}/respond`;

      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          llm_enabled: llmEnabled,
          llm_provider: llmProvider,
          llm_model: llmModel,
          llm_api_key: llmApiKey || undefined,
          llm_base_url: llmBaseUrl || undefined,
        }),
      });
      const j = await r.json();
      if (j.success) {
        setActiveSession(j.data);
        loadSessions();
      }
    } catch { /* ignore */ }
    setSending(false);
  };

  const updateLLMSettings = async () => {
    if (!activeSession) return;
    try {
      await fetch(`${BASE_URL}/api/agent/sessions/${activeSession.id}/llm-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: llmProvider,
          model: llmModel,
          api_key: llmApiKey || undefined,
          base_url: llmBaseUrl || undefined,
          enabled: llmEnabled,
        }),
      });
    } catch { /* ignore */ }
  };

  // Auto-save LLM settings when they change (debounced)
  useEffect(() => {
    if (!activeSession) return;
    const timer = setTimeout(() => updateLLMSettings(), 500);
    return () => clearTimeout(timer);
  }, [llmEnabled, llmProvider, llmModel, llmApiKey, llmBaseUrl, activeSession?.id]);

  const uploadImages = async (files: FileList) => {
    if (!activeSession || !activeSession.datasetId) return;
    setSending(true);
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('files', f));

    try {
      const r = await fetch(`${BASE_URL}/api/agent/sessions/${activeSession.id}/upload-images`, {
        method: 'POST',
        body: formData,
      });
      const j = await r.json();
      if (j.success) {
        loadSession(activeSession.id);
      }
    } catch { /* ignore */ }
    setSending(false);
  };

  const triggerAutoLabel = async () => {
    if (!activeSession) return;
    setSending(true);
    try {
      const r = await fetch(`${BASE_URL}/api/agent/sessions/${activeSession.id}/auto-label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_path: 'yolov8n.pt', confidence: 0.25 }),
      });
      await r.json();
      loadSession(activeSession.id);
    } catch { /* ignore */ }
    setSending(false);
  };

  const startTraining = async () => {
    if (!activeSession) return;
    setSending(true);
    try {
      const cfg = activeSession.config || {};
      const r = await fetch(`${BASE_URL}/api/agent/sessions/${activeSession.id}/start-training`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ framework: cfg.framework || 'pytorch', epochs: 3 }),
      });
      await r.json();
      loadSession(activeSession.id);
    } catch { /* ignore */ }
    setSending(false);
  };

  const currentPhaseIndex = activeSession
    ? GATHERING_PHASES.indexOf(activeSession.currentPhase)
    : -1;

  const isCompleted = activeSession?.status === 'completed' || activeSession?.status === 'completed_with_errors';
  const isGathering = activeSession?.status === 'gathering';
  const hasDataset = !!activeSession?.datasetId;

  return (
    <div className="h-[calc(100vh-84px)] flex bg-gray-50">
      {/* ── Sessions Sidebar ── */}
      {showSidebar && (
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-gray-100">
            <button onClick={createSession}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0c4a6e] to-[#0ea5e9] text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all">
              <Plus className="w-5 h-5" /> New Project Agent
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map(s => (
              <div key={s.id}
                onClick={() => loadSession(s.id)}
                className={`group p-3 rounded-xl cursor-pointer transition-all ${
                  activeSession?.id === s.id
                    ? 'bg-sky-50 border-2 border-sky-200'
                    : 'hover:bg-gray-50 border-2 border-transparent'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{s.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                        s.status === 'completed' ? 'bg-green-400' :
                        s.status === 'gathering' ? 'bg-yellow-400' :
                        s.status === 'executing' ? 'bg-blue-400' : 'bg-gray-300'
                      }`} />
                      {s.status}
                      <span className="mx-0.5">·</span>
                      <span>{new Date(s.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Bot className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No sessions yet</p>
                <p className="text-xs">Click "New Project Agent" to start</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeSession ? (
          /* ── Empty State ── */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-xl mx-auto px-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#0c4a6e] to-[#0ea5e9] rounded-2xl flex items-center justify-center shadow-2xl">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0c4a6e] to-[#0ea5e9] bg-clip-text text-transparent mb-3">
                Hey! I'm your AI Project Assistant
              </h1>
              <p className="text-gray-500 text-base mb-6 leading-relaxed">
                Think of me as a colleague who'll help you set up a complete Computer Vision pipeline
                through a simple conversation. I'll ask a few questions, then build everything for you —
                project, cameras, datasets, the whole stack.
              </p>

              {/* LLM Toggle for new sessions */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 text-left shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <span className="text-base font-bold text-gray-800">LLM-Powered Agent</span>
                    {llmEnabled && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">AI ENABLED</span>
                    )}
                  </div>
                  <button
                    onClick={() => setLlmEnabled(!llmEnabled)}
                    className="transition-all"
                    title={llmEnabled ? 'Disable LLM' : 'Enable LLM'}
                  >
                    {llmEnabled ? (
                      <ToggleRight className="w-8 h-8 text-purple-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-400" />
                    )}
                  </button>
                </div>
                {llmEnabled && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      {LLM_PROVIDERS.map(p => (
                        <button key={p.id}
                          onClick={() => { setLlmProvider(p.id); setLlmModel(p.models[0]); }}
                          className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                            llmProvider === p.id
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}>
                          <span className="mr-1">{p.icon}</span> {p.name}
                        </button>
                      ))}
                    </div>
                    <select
                      value={llmModel}
                      onChange={(e) => setLlmModel(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                      {LLM_PROVIDERS.find(p => p.id === llmProvider)?.models.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    {LLM_PROVIDERS.find(p => p.id === llmProvider)?.requiresKey && (
                      <input
                        type="password"
                        placeholder="API Key (never stored on server)"
                        value={llmApiKey}
                        onChange={(e) => setLlmApiKey(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                      />
                    )}
                    <p className="text-xs text-gray-400 italic">
                      {LLM_PROVIDERS.find(p => p.id === llmProvider)?.description} — Agent will use LLM to understand your responses naturally
                    </p>
                  </div>
                )}
                {!llmEnabled && (
                  <p className="text-xs text-gray-400">
                    Enable to get AI-powered intelligent responses, natural language parsing, and contextual conversations
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { icon: Zap, title: 'Just Chat', desc: 'Answer questions naturally' },
                  { icon: Eye, title: 'You\'re in Control', desc: 'Review before I create anything' },
                  { icon: Sparkles, title: 'I Do the Work', desc: 'Auto-create all resources' },
                ].map((f, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <f.icon className="w-6 h-6 text-sky-600 mb-2" />
                    <div className="text-sm font-bold">{f.title}</div>
                    <div className="text-xs text-gray-400">{f.desc}</div>
                  </div>
                ))}
              </div>
              <button onClick={createSession}
                className="px-8 py-3 bg-gradient-to-r from-[#0c4a6e] to-[#0ea5e9] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 mx-auto">
                <Sparkles className="w-5 h-5" /> Start New Project
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Progress Tracker ── */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowSidebar(!showSidebar)}
                    className="p-1 hover:bg-gray-100 rounded-lg">
                    <ChevronRight className={`w-4 h-4 transition-transform ${showSidebar ? 'rotate-180' : ''}`} />
                  </button>
                  <Bot className="w-5 h-5 text-sky-700" />
                  <span className="text-base font-bold">{activeSession.title}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    activeSession.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    activeSession.status === 'gathering' ? 'bg-amber-100 text-amber-700' :
                    activeSession.status === 'executing' ? 'bg-sky-100 text-sky-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {activeSession.status}
                  </span>
                  {llmEnabled && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center gap-1">
                      <Brain className="w-3.5 h-3.5" /> LLM
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isCompleted && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {activeSession.projectId && <span>Project #{activeSession.projectId}</span>}
                      {activeSession.datasetId && <span>Dataset #{activeSession.datasetId}</span>}
                    </div>
                  )}
                  <button onClick={() => setShowLLMSettings(!showLLMSettings)}
                    className={`p-1.5 rounded-lg transition-all ${
                      showLLMSettings ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                    title="LLM Settings">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* LLM Settings Collapse */}
              {showLLMSettings && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3 mb-2 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-bold text-purple-800">LLM Intelligence</span>
                    </div>
                    <button
                      onClick={() => setLlmEnabled(!llmEnabled)}
                      className="transition-all"
                    >
                      {llmEnabled ? (
                        <ToggleRight className="w-7 h-7 text-purple-600" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {llmEnabled ? (
                    <div className="space-y-2">
                      <div className="flex gap-1.5">
                        {LLM_PROVIDERS.map(p => (
                          <button key={p.id}
                            onClick={() => { setLlmProvider(p.id); setLlmModel(p.models[0]); }}
                            className={`flex-1 px-2.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                              llmProvider === p.id
                                ? 'border-purple-400 bg-white text-purple-700 shadow-sm'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}>
                            {p.icon} {p.name}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={llmModel}
                          onChange={(e) => setLlmModel(e.target.value)}
                          className="flex-1 px-2.5 py-2 border border-purple-200 rounded-lg text-xs bg-white"
                        >
                          {LLM_PROVIDERS.find(p => p.id === llmProvider)?.models.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        {LLM_PROVIDERS.find(p => p.id === llmProvider)?.requiresKey && (
                          <input
                            type="password"
                            placeholder="API Key"
                            value={llmApiKey}
                            onChange={(e) => setLlmApiKey(e.target.value)}
                            className="flex-1 px-2.5 py-2 border border-purple-200 rounded-lg text-xs"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-purple-600">
                        <Wifi className="w-3.5 h-3.5" />
                        <span>LLM powers: natural language parsing • intelligent responses • context-aware chat</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Enable LLM to get AI-powered intelligent responses and natural language understanding
                    </p>
                  )}
                </div>
              )}

              {/* Phase progress bar */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {GATHERING_PHASES.map((phase, i) => {
                  const Icon = PHASE_ICONS[phase] || Sparkles;
                  const label = PHASE_LABELS[phase] || phase;
                  const isCurrent = activeSession.currentPhase === phase;
                  const isPast = currentPhaseIndex > i || isCompleted;
                  return (
                    <div key={phase} className="flex items-center flex-shrink-0">
                      <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isCurrent ? 'bg-sky-100 text-sky-700 ring-2 ring-sky-300' :
                        isPast ? 'bg-green-50 text-green-600' :
                        'bg-gray-50 text-gray-400'
                      }`}>
                        {isPast && !isCurrent ? <CheckCircle className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                        {label}
                      </div>
                      {i < GATHERING_PHASES.length - 1 && (
                        <ArrowRight className={`w-3 h-3 mx-0.5 flex-shrink-0 ${isPast ? 'text-green-400' : 'text-gray-300'}`} />
                      )}
                    </div>
                  );
                })}
                {isCompleted && (
                  <>
                    <ArrowRight className="w-3 h-3 mx-0.5 text-green-400 flex-shrink-0" />
                    <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300">
                      <CheckCircle className="w-3 h-3" /> Complete!
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Chat Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {activeSession.steps.map((step) => (
                <StepBubble key={step.id} step={step} />
              ))}

              {sending && (
                <div className="flex items-start gap-3 text-sm ml-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0c4a6e] to-[#0ea5e9] flex items-center justify-center flex-shrink-0 shadow-md">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-gray-400 text-sm italic">Working on it...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* ── Action Buttons (post-completion) ── */}
            {isCompleted && hasDataset && (
              <div className="px-4 pb-2 flex-shrink-0">
                <div className="flex items-center gap-2 flex-wrap bg-sky-50 p-3 rounded-xl border border-sky-200">
                  <span className="text-sm font-semibold text-sky-800 mr-1">Quick Actions:</span>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-sky-200 rounded-lg text-sm font-semibold text-sky-700 hover:bg-sky-100 transition-all">
                    <Upload className="w-4 h-4" /> Upload Images
                  </button>
                  <button onClick={triggerAutoLabel}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-sky-200 rounded-lg text-sm font-semibold text-sky-700 hover:bg-sky-100 transition-all">
                    <Tag className="w-4 h-4" /> Auto-Label
                  </button>
                  <button onClick={startTraining}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-sky-200 rounded-lg text-sm font-semibold text-sky-700 hover:bg-sky-100 transition-all">
                    <Play className="w-4 h-4" /> Start Training
                  </button>
                  <Link to="/labeling"
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-sky-200 rounded-lg text-sm font-semibold text-sky-700 hover:bg-sky-100 transition-all">
                    <ExternalLink className="w-3.5 h-3.5" /> Open Labeling
                  </Link>
                  <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
                    onChange={(e) => e.target.files && uploadImages(e.target.files)} />
                </div>
              </div>
            )}

            {/* ── Input Bar ── */}
            <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center gap-3">
                {hasDataset && (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                    title="Upload images">
                    <Upload className="w-5 h-5" />
                  </button>
                )}
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendResponse()}
                  placeholder={
                    isCompleted
                      ? llmEnabled
                        ? `Ask me anything — powered by ${llmModel}...`
                        : 'Ask me anything — upload images, start training, or just chat...'
                      : 'Type your answer here...'
                  }
                  disabled={sending}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-sky-500 outline-none transition-all disabled:opacity-50"
                />
                <button onClick={sendResponse} disabled={!input.trim() || sending}
                  className="p-2.5 bg-gradient-to-r from-[#0c4a6e] to-[#0ea5e9] text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-30">
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
              {/* LLM Status Bar */}
              <div className="flex items-center justify-between mt-1.5 px-1">
                <div className="flex items-center gap-2">
                  {llmEnabled ? (
                    <span className="flex items-center gap-1 text-xs text-purple-600">
                      <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                      LLM: {LLM_PROVIDERS.find(p => p.id === llmProvider)?.icon} {llmModel}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <WifiOff className="w-3.5 h-3.5" /> Static mode — enable LLM for intelligent responses
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowLLMSettings(!showLLMSettings)}
                  className="text-xs text-gray-400 hover:text-purple-600 flex items-center gap-0.5"
                >
                  <Settings className="w-3.5 h-3.5" /> Settings
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ───── Step Bubble Component ───── */
function StepBubble({ step }: { step: AgentStep }) {
  const isUser = step.role === 'user';
  const isSystem = step.role === 'system';
  const isError = step.stepType === 'error';
  const isResult = step.stepType === 'result';
  const isAction = step.stepType === 'action';
  const link = step.metadata?.link;

  if (isAction) {
    return (
      <div className="flex items-center gap-3 py-1.5 px-4 ml-11">
        <div className="flex items-center gap-2 text-sm text-blue-500 bg-blue-50/70 rounded-full px-3 py-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="italic">{step.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
      {/* Bot avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0c4a6e] to-[#0ea5e9] flex items-center justify-center flex-shrink-0 shadow-md mt-1">
          {isError ? (
            <AlertTriangle className="w-4 h-4 text-white" />
          ) : isResult ? (
            <CheckCircle className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-4 h-4 text-white" />
          )}
        </div>
      )}

      <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
        isUser
          ? 'bg-gradient-to-r from-[#0c4a6e] to-[#0369a1] text-white rounded-br-md'
          : isError
            ? 'bg-red-50 border border-red-200 text-red-700 rounded-bl-md'
            : isResult
              ? 'bg-green-50/80 border border-green-200 text-gray-800 rounded-bl-md'
              : isSystem
                ? 'bg-blue-50/80 border border-blue-200 text-gray-800 rounded-bl-md'
                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
      }`}>
        {/* Timestamp for non-user */}
        {!isUser && (
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
              {step.role === 'agent' ? 'AI Assistant' : isError ? 'Error' : 'System'}
              {step.metadata?.llm_enhanced && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 font-bold">LLM</span>
              )}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(step.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </span>
          </div>
        )}

        {/* Content */}
        <div className={isUser ? 'text-base' : ''}>
          {isUser ? step.content : renderMarkdown(step.content)}
        </div>

        {/* Link button */}
        {link && (
          <Link to={link}
            className="inline-flex items-center gap-1.5 mt-2 px-3 py-2 bg-white/80 border border-sky-200 rounded-lg text-sm font-semibold text-sky-700 hover:bg-sky-50 transition-all">
            <ExternalLink className="w-3 h-3" /> Open {step.metadata?.entity || 'page'}
          </Link>
        )}

        {/* Snapshot */}
        {step.snapshotUrl && (
          <img src={step.snapshotUrl} alt="Snapshot" className="mt-2 rounded-lg max-h-40 border border-gray-200" />
        )}

        {/* Timestamp for user */}
        {isUser && (
          <div className="text-xs opacity-60 mt-1 text-right">
            {new Date(step.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center flex-shrink-0 shadow-md mt-1">
          <span className="text-white text-sm font-bold">You</span>
        </div>
      )}
    </div>
  );
}
