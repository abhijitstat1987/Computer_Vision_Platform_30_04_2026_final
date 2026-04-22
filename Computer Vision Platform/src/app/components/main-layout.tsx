import { Link, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Bot,
  PenSquare,
  Database,
  BrainCircuit,
  Tag,
  ShieldCheck,
  FlaskConical,
  Rocket,
  FileText,
  MessageSquareText,
  Settings,
  FolderKanban,
  GitBranch,
  Network,
  BarChart3,
  Bell,
  User,
} from 'lucide-react';

const sidebarItems = [
  { path: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
  { path: '/overview', icon: BrainCircuit, label: 'Generative\nAI' },
  { path: '/labeling', icon: PenSquare, label: 'Annotator' },
  { path: '/model-development', icon: Database, label: 'Model\nRegistry' },
  { path: '/analytics', icon: BrainCircuit, label: 'Text\nAnalysis' },
  { path: '/hierarchy', icon: Network, label: 'Hierarchy\nSetup' },
  { path: '/projects', icon: FolderKanban, label: 'Projects' },
  { path: '/configuration/cameras', icon: Settings, label: 'Config' },
  { path: '/agentic-automation', icon: ShieldCheck, label: 'Agentic\nAutomation' },
  { path: '/agent', icon: Bot, label: 'Agentic\nAI Flow' },
  { path: '/model-benchmark', icon: FlaskConical, label: 'Benchmark' },
  { path: '/model-deployment', icon: Rocket, label: 'Deploy' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
  { path: '/reports', icon: FileText, label: 'Reports' },
];

interface MainLayoutProps {
  children: React.ReactNode;
  activeVision: 'safety' | 'quality';
  onVisionChange: (v: 'safety' | 'quality') => void;
}

export function MainLayout({ children, activeVision, onVisionChange }: MainLayoutProps) {
  const location = useLocation();

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#e8e8e8]">
      {/* ─── Top Header Bar ─── */}
      <header className="h-12 min-h-[48px] bg-white border-b border-gray-200 flex items-center px-5 flex-shrink-0 z-40">
        {/* Brand */}
        <div className="flex items-baseline gap-0">
          <span className="text-[22px] font-light text-[#0077c8] tracking-tight">Insights</span>
          <span className="text-[22px] font-light text-gray-400 mx-[2px]">|</span>
          <span className="text-[22px] font-bold text-gray-700 tracking-tight">N</span>
          <span className="text-[22px] font-bold text-[#d4a843] tracking-tight">x</span>
          <span className="text-[22px] font-bold text-gray-700 tracking-tight">T</span>
          <span className="text-[17px] font-medium text-gray-700 ml-2 tracking-tight">Computer Vision</span>
        </div>
        <div className="flex-1" />
        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
          <User className="w-5 h-5 text-gray-500" />
        </div>
      </header>

      {/* ─── Body: Sidebar + Content ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Narrow Icon Sidebar */}
        <aside className="w-[76px] bg-white border-r border-gray-200 flex flex-col items-center py-2 flex-shrink-0 overflow-y-auto">
          <nav className="flex flex-col items-center gap-0 w-full">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path === '/configuration/cameras' && location.pathname.startsWith('/configuration')) ||
                (item.path === '/projects' && location.pathname.startsWith('/projects'));
              return (
                <Link
                  key={item.path + item.label}
                  to={item.path}
                  title={item.label.replace('\n', ' ')}
                  className={`flex flex-col items-center justify-center w-full py-3 px-1 transition-all relative ${
                    isActive
                      ? 'bg-[#0077c8] text-white'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  {/* Active left border */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#d4a843]" />
                  )}
                  <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  <span className={`text-[9px] leading-[1.2] text-center font-medium whitespace-pre-line ${
                    isActive ? 'text-white' : 'text-gray-500'
                  }`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom AI Chat */}
          <div className="mt-auto w-full">
            <Link
              to="/chatbot"
              className={`flex flex-col items-center justify-center w-full py-3 transition-all relative ${
                location.pathname === '/chatbot'
                  ? 'bg-[#0077c8] text-white'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              {location.pathname === '/chatbot' && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#d4a843]" />
              )}
              <MessageSquareText className="w-5 h-5 mb-1" />
              <span className="text-[9px] font-medium">AI Chat</span>
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
