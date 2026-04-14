import { useState, useEffect } from 'react';
import { Database, Check, AlertCircle, Plus, Edit, Trash2, X, Save, RefreshCw, Loader2 } from 'lucide-react';
import { dbConfigsService, DbConfig, DbConfigPayload } from '../../../services/dbConfigs';

const emptyForm: DbConfigPayload = { name: '', host: '', port: 5432, db_type: 'postgresql', username: '', db_name: '', status: 'disconnected', db_usage: '0%' };

export function DatabaseConfig() {
  const [configs, setConfigs]           = useState<DbConfig[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingConfig, setEditingConfig]   = useState<DbConfig | null>(null);
  const [formData, setFormData]         = useState<DbConfigPayload>(emptyForm);

  useEffect(() => { fetchConfigs(); }, []);

  async function fetchConfigs() {
    try { setLoading(true); const data = await dbConfigsService.list(); setConfigs(Array.isArray(data) ? data : []); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleAdd() {
    try {
      setSaving(true);
      const created = await dbConfigsService.create(formData);
      setConfigs(prev => [...prev, created]);
      setIsAddModalOpen(false); resetForm();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleUpdate() {
    if (!editingConfig) return;
    try {
      setSaving(true);
      const updated = await dbConfigsService.update(editingConfig.id, formData);
      setConfigs(prev => prev.map(c => c.id === updated.id ? updated : c));
      setEditingConfig(null); resetForm();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this database configuration?')) return;
    try { await dbConfigsService.remove(id); setConfigs(prev => prev.filter(c => c.id !== id)); }
    catch (e: any) { setError(e.message); }
  }

  function resetForm() { setFormData(emptyForm); }

  function openEditModal(cfg: DbConfig) {
    setEditingConfig(cfg);
    setFormData({ name: cfg.name, host: cfg.host, port: cfg.port, db_type: cfg.type, username: cfg.username, db_name: cfg.database, status: cfg.status, db_usage: cfg.usage });
  }

  const FormModal = ({ isOpen, onClose, onSave, title }: { isOpen: boolean; onClose: () => void; onSave: () => void; title: string }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Configuration Name *</label>
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="PostgreSQL - Main DB" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Database Type</label>
              <select value={formData.db_type} onChange={e => setFormData({ ...formData, db_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                {['postgresql','mysql','mongodb','redis','timescaledb','influxdb','cassandra'].map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as DbConfig['status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="connected">Connected</option>
                <option value="disconnected">Disconnected</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Host</label>
              <input type="text" value={formData.host} onChange={e => setFormData({ ...formData, host: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="db.production.local" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Port</label>
              <input type="number" value={formData.port} onChange={e => setFormData({ ...formData, port: parseInt(e.target.value) || 5432 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="db_admin" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Database Name</label>
              <input type="text" value={formData.db_name} onChange={e => setFormData({ ...formData, db_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="cv_platform" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Usage</label>
              <input type="text" value={formData.db_usage} onChange={e => setFormData({ ...formData, db_usage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="45%" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onSave} disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Configuration
            </button>
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-gray-500"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...</div>;

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between">{error}<button onClick={() => setError(null)}><X className="w-4 h-4" /></button></div>}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Database Configuration</h3>
          <p className="text-sm text-gray-600">{configs.length} databases configured</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Database
        </button>
      </div>
      <div className="grid gap-4">
        {configs.length === 0 && (
          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            No database configurations yet. Click "Add Database" to get started.
          </div>
        )}
        {configs.map(cfg => (
          <div key={cfg.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex gap-4 flex-1">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${cfg.status === 'connected' ? 'bg-green-100' : cfg.status === 'error' ? 'bg-red-100' : 'bg-gray-100'}`}>
                  <Database className={`w-6 h-6 ${cfg.status === 'connected' ? 'text-green-600' : cfg.status === 'error' ? 'text-red-600' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold">{cfg.name}</h4>
                    {cfg.status === 'connected' ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700"><Check className="w-3 h-3" /> Connected</span>
                    ) : cfg.status === 'error' ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700"><AlertCircle className="w-3 h-3" /> Error</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">Disconnected</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div><span className="font-medium">Host:</span> {cfg.host || 'N/A'}</div>
                    <div><span className="font-medium">Port:</span> {cfg.port}</div>
                    <div><span className="font-medium">Type:</span> {cfg.type}</div>
                    <div><span className="font-medium">Usage:</span> {cfg.usage}</div>
                  </div>
                  {(cfg.database || cfg.username) && (
                    <div className="mt-2 text-sm text-gray-600">
                      {cfg.database && <><span className="font-medium">DB:</span> {cfg.database}</>}
                      {cfg.username && <><span className="font-medium ml-4">User:</span> {cfg.username}</>}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditModal(cfg)} className="p-2 hover:bg-blue-50 rounded-lg" title="Edit"><Edit className="w-4 h-4 text-blue-600" /></button>
                <button onClick={() => handleDelete(cfg.id)} className="p-2 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4 text-red-600" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <FormModal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); resetForm(); }} onSave={handleAdd} title="Add New Database Configuration" />
      <FormModal isOpen={editingConfig !== null} onClose={() => { setEditingConfig(null); resetForm(); }} onSave={handleUpdate} title="Edit Database Configuration" />
    </div>
  );
}
