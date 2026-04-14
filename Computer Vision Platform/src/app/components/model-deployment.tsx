import { useState, useEffect } from 'react';
import { Rocket, Activity, MapPin, Settings, Play, StopCircle, Trash2, X, Loader2 } from 'lucide-react';
import { modelDeploymentsService, ModelDeployment as DeploymentRecord, DeploymentPayload } from '../../services/modelDeployments';

interface AvailableModel {
  name: string;
  version: string;
  accuracy: string;
  status: 'ready' | 'testing';
}

const availableModelsData: AvailableModel[] = [
  { name: 'PPE Detection v4',      version: '4.0.0', accuracy: '97.2%', status: 'ready' },
  { name: 'Enhanced Safety Zone',  version: '2.5.1', accuracy: '95.8%', status: 'ready' },
  { name: 'Fall Detection v2',     version: '2.0.0', accuracy: '94.5%', status: 'testing' },
];

const allStations = [
  'Station A-01', 'Station A-02', 'Station A-03',
  'Station B-01', 'Station B-02', 'Station B-03', 'Station B-04', 'Station B-05',
  'Station C-01', 'Station C-02', 'Station C-03', 'Station C-04', 'Station C-05', 'Station C-06', 'Station C-07', 'Station C-08',
  'Station D-01', 'Station D-02', 'Station D-03', 'Station D-04',
];

export function ModelDeployment() {
  const [deployments, setDeployments]   = useState<DeploymentRecord[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [availableModels]               = useState<AvailableModel[]>(availableModelsData);
  const [isNewDeploymentModalOpen, setIsNewDeploymentModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen]               = useState(false);
  const [selectedDeployment, setSelectedDeployment]             = useState<DeploymentRecord | null>(null);
  const [newDepModel, setNewDepModel]   = useState('');
  const [newDepStations, setNewDepStations] = useState<string[]>([]);

  useEffect(() => { fetchDeployments(); }, []);

  async function fetchDeployments() {
    try {
      setLoading(true);
      const data = await modelDeploymentsService.list();
      setDeployments(Array.isArray(data) ? data : []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleStartDeployment(depId: number) {
    try {
      const updated = await modelDeploymentsService.setStatus(depId, 'running');
      setDeployments(prev => prev.map(d => d.id === updated.id ? updated : d));
    } catch (e: any) { setError(e.message); }
  }

  async function handleStopDeployment(depId: number) {
    if (!confirm('Are you sure you want to stop this deployment?')) return;
    try {
      const updated = await modelDeploymentsService.setStatus(depId, 'stopped');
      setDeployments(prev => prev.map(d => d.id === updated.id ? updated : d));
    } catch (e: any) { setError(e.message); }
  }

  async function handleDeleteDeployment(depId: number) {
    if (!confirm('Are you sure you want to delete this deployment?')) return;
    try {
      await modelDeploymentsService.remove(depId);
      setDeployments(prev => prev.filter(d => d.id !== depId));
    } catch (e: any) { setError(e.message); }
  }

  const handleOpenConfig = (deployment: DeploymentRecord) => {
    setSelectedDeployment(deployment);
    setIsConfigModalOpen(true);
  };

  const handleDeployModel = (model: AvailableModel) => {
    setNewDepModel(model.name);
    setIsNewDeploymentModalOpen(true);
  };

  async function handleCreateDeployment() {
    if (!newDepModel || newDepStations.length === 0) return;
    try {
      setSaving(true);
      const payload: DeploymentPayload = {
        model: newDepModel,
        stations: newDepStations,
        status: 'stopped',
        fps: 0,
        latency: '-',
        uptime: '0%',
        detections: '0',
      };
      const created = await modelDeploymentsService.create(payload);
      setDeployments(prev => [...prev, created]);
      setIsNewDeploymentModalOpen(false);
      setNewDepModel('');
      setNewDepStations([]);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  const handleToggleStation = (station: string) => {
    setNewDepStations(prev =>
      prev.includes(station) ? prev.filter(s => s !== station) : [...prev, station]
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-gray-500">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading deployments...
    </div>
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between">
          {error}<button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Model Deployment</h2>
          <p className="text-gray-600">Manage deployed models across stations</p>
        </div>
        <button
          onClick={() => setIsNewDeploymentModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Rocket className="w-4 h-4" />
          New Deployment
        </button>
      </div>

      {/* Active Deployments */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Active Deployments ({deployments.length})</h3>
        {deployments.length === 0 && (
          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            No deployments yet. Click "New Deployment" to get started.
          </div>
        )}
        <div className="grid gap-4">
          {deployments.map((deployment) => (
            <div key={deployment.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold">{deployment.model}</h4>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      deployment.status === 'running' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {deployment.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{deployment.stations.join(', ')}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleOpenConfig(deployment)} className="p-2 hover:bg-gray-100 rounded-lg" title="Settings">
                    <Settings className="w-4 h-4 text-gray-600" />
                  </button>
                  <button onClick={() => handleDeleteDeployment(deployment.id)} className="p-2 hover:bg-red-50 rounded-lg" title="Delete">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                    <Activity className="w-3 h-3" />FPS
                  </div>
                  <div className="text-lg font-semibold">{deployment.fps}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">Latency</div>
                  <div className="text-lg font-semibold">{deployment.latency}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">Uptime</div>
                  <div className="text-lg font-semibold text-green-600">{deployment.uptime}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">Detections</div>
                  <div className="text-lg font-semibold">{deployment.detections}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-center">
                  {deployment.status === 'running' ? (
                    <button
                      onClick={() => handleStopDeployment(deployment.id)}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      <StopCircle className="w-3 h-3" />Stop
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartDeployment(deployment.id)}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      <Play className="w-3 h-3" />Start
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available Models for Deployment */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Available Models for Deployment</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {availableModels.map((model, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold mb-1">{model.name}</h4>
                  <p className="text-sm text-gray-600">v{model.version}</p>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  model.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {model.status}
                </span>
              </div>
              <div className="mb-4">
                <div className="text-xs text-gray-600 mb-1">Accuracy</div>
                <div className="text-xl font-bold text-green-600">{model.accuracy}</div>
              </div>
              <button
                onClick={() => handleDeployModel(model)}
                disabled={model.status !== 'ready'}
                className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Rocket className="w-4 h-4 inline mr-2" />
                Deploy Model
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Deployment Zones */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Deployment Zones</h3>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="grid md:grid-cols-4 gap-6">
            {['Zone A', 'Zone B', 'Zone C', 'Zone D'].map((zone, idx) => (
              <div key={idx} className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-semibold mb-1">{zone}</h4>
                <p className="text-sm text-gray-600">{3 + idx} Stations</p>
                <p className="text-sm text-gray-600">{2 + (idx % 2)} Models Active</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Deployment Modal */}
      {isNewDeploymentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create New Deployment</h3>
              <button onClick={() => setIsNewDeploymentModalOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Model *</label>
                <select
                  value={newDepModel}
                  onChange={(e) => setNewDepModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Model</option>
                  {availableModels.filter(m => m.status === 'ready').map(model => (
                    <option key={model.name} value={model.name}>
                      {model.name} - v{model.version} ({model.accuracy})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Select Stations *</label>
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                  {allStations.map(station => (
                    <label key={station} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newDepStations.includes(station)}
                        onChange={() => handleToggleStation(station)}
                        className="rounded"
                      />
                      <span className="text-sm">{station}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">{newDepStations.length} stations selected</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateDeployment}
                disabled={saving || !newDepModel || newDepStations.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <Rocket className="w-4 h-4" />
                Create Deployment
              </button>
              <button
                onClick={() => { setIsNewDeploymentModalOpen(false); setNewDepModel(''); setNewDepStations([]); }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {isConfigModalOpen && selectedDeployment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Deployment Settings</h3>
              <button onClick={() => setIsConfigModalOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <input
                  type="text"
                  value={selectedDeployment.model}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stations</label>
                <div className="text-sm text-gray-600">{selectedDeployment.stations.join(', ')}</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <div className="text-sm">{selectedDeployment.status}</div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
