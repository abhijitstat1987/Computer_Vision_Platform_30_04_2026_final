import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IndustrialAILogo } from './IndustrialAILogo';
import {
  LayoutDashboard,
  Settings,
  GitBranch,
  Rocket,
  BarChart3,
  Bell,
  FileText,
  Camera,
  Menu,
  X,
  Layers,
  Network,
  FolderKanban,
  Tag,
  ShieldCheck,
  FlaskConical,
  Shield,
  CheckCircle,
  Bot,
}  from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Vision Dashboard' },
  { path: '/overview', icon: Layers, label: 'System Overview' },
  { path: '/hierarchy', icon: Network, label: 'Hierarchy Setup' },
  { path: '/projects', icon: FolderKanban, label: 'Projects & Use Cases' },
  { path: '/labeling', icon: Tag, label: 'Labeling Platform' },
  { path: '/label-review', icon: ShieldCheck, label: 'Label Review' },
  { path: '/configuration/cameras', icon: Settings, label: 'Configuration' },
  { path: '/model-development', icon: GitBranch, label: 'Model Development' },
  { path: '/model-benchmark', icon: FlaskConical, label: 'Model Benchmark' },
  { path: '/model-deployment', icon: Rocket, label: 'Model Deployment' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
  { path: '/reports', icon: FileText, label: 'Reports' },
  { path: '/agent', icon: Bot, label: 'AI Agent Builder' },
];

interface MainLayoutProps {
  children: React.ReactNode;
  activeVision: 'safety' | 'quality';
  onVisionChange: (v: 'safety' | 'quality') => void;
}

export function MainLayout({ children, activeVision, onVisionChange }: MainLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Combined Header — single bar, 56px */}
      <header className="h-14 min-h-[56px] bg-gradient-to-r from-[#0a1628] via-[#0f2847] to-[#0a1628] border-b border-sky-900/40 shadow-2xl flex items-center px-4 gap-3 z-40 flex-shrink-0">
        {/* Hamburger */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white flex-shrink-0"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        {/* Logo + brand */}
        <IndustrialAILogo size={34} variant="full" />

        {/* Divider */}
        <div className="w-px h-8 bg-white/10 mx-2 flex-shrink-0" />

        {/* Vision toggle — compact */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onVisionChange('safety')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeVision === 'safety'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'text-sky-300/70 hover:bg-white/5 hover:text-sky-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Safety Vision
          </button>
          <button
            onClick={() => onVisionChange('quality')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeVision === 'quality'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-sky-300/70 hover:bg-white/5 hover:text-sky-200'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Quality Vision
          </button>
        </div>

        <div className="flex-1" />

        {/* Status badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg flex-shrink-0">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50" />
          <span className="text-xs text-white/80 font-medium">All Systems Active</span>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`flex flex-col bg-white border-r border-slate-200/80 shadow-sm transition-all duration-300 flex-shrink-0 overflow-hidden ${
            sidebarOpen ? 'w-56' : 'w-0'
          }`}
        >
          <nav className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
            {navItems.filter(i => i.path !== '/agent').map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path === '/configuration/cameras' && location.pathname.startsWith('/configuration')) ||
                (item.path === '/projects' && location.pathname.startsWith('/projects'));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-[13px] font-medium whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 border border-sky-200/60 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
            {/* AI Agent — special treatment */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <Link
                to="/agent"
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-[13px] font-semibold whitespace-nowrap ${
                  location.pathname === '/agent'
                    ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-lg shadow-sky-600/20'
                    : 'bg-gradient-to-r from-sky-50 to-cyan-50 text-sky-700 border border-sky-200 hover:shadow-md hover:border-sky-300'
                }`}
              >
                <Bot className="w-4 h-4 flex-shrink-0" />
                <span>AI Agent Builder</span>
                <span className={`ml-auto text-[8px] px-1.5 py-0.5 rounded-full font-bold ${
                  location.pathname === '/agent' ? 'bg-white/20 text-white' : 'bg-sky-600/10 text-sky-600'
                }`}>NEW</span>
              </Link>
            </div>
          </nav>

          <div className="p-2.5 border-t border-slate-100 flex-shrink-0">
            <div className="bg-gradient-to-br from-slate-50 to-sky-50/50 rounded-lg px-3 py-2.5 border border-slate-100">
              <div className="text-[10px] font-semibold text-slate-600">Industrial AI Platform</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Version 2.4.1 · Enterprise</div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
