import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Camera, Cpu, Database, FileText, FolderGit, Brain } from 'lucide-react';
import { CameraConfig } from '@/app/components/config/camera-config';
import { EdgeDeviceConfig } from '@/app/components/config/edge-device-config';
import { DatabaseConfig } from '@/app/components/config/database-config';
import { LogConfig } from '@/app/components/config/log-config';
import { ModelRepoConfig } from '@/app/components/config/model-repo-config';
import { LLMRepoConfig } from '@/app/components/config/llm-repo-config';

const configTabs = [
  { path: 'cameras', icon: Camera, label: 'Cameras' },
  { path: 'edge-devices', icon: Cpu, label: 'Edge Devices' },
  { path: 'database', icon: Database, label: 'Database' },
  { path: 'logs', icon: FileText, label: 'Log Files' },
  { path: 'model-repo', icon: FolderGit, label: 'Model Repository' },
  { path: 'llm-repo', icon: Brain, label: 'LLM Repository' },
];

export function ConfigurationPage() {
  const location = useLocation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configuration</h2>
        <p className="text-gray-600">Manage system configurations</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {configTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname.includes(tab.path);
              return (
                <Link
                  key={tab.path}
                  to={`/configuration/${tab.path}`}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 whitespace-nowrap ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          <Routes>
            <Route path="cameras" element={<CameraConfig />} />
            <Route path="edge-devices" element={<EdgeDeviceConfig />} />
            <Route path="database" element={<DatabaseConfig />} />
            <Route path="logs" element={<LogConfig />} />
            <Route path="model-repo" element={<ModelRepoConfig />} />
            <Route path="llm-repo" element={<LLMRepoConfig />} />
            <Route path="/" element={<CameraConfig />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
