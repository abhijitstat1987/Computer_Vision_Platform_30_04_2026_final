import { useState, useEffect } from 'react';
import { FileText, Trash2, Edit, X, Save, Plus, Loader2 } from 'lucide-react';
import { logConfigsService } from '../../../services/logConfigs';

// Inline types to avoid Babel scope collision with service's `LogConfig` type name
interface LogEntry {
  id: number;
  category: string;
  level: 'info' | 'debug' | 'warning' | 'error';
  retention: string;
  maxSize: string;
  rotation: string;
}

interface LogForm {
  category: string;
  retention: string;
  max_size: string;
  rotation: string;
  log_level: string;
}

const emptyForm: LogForm = {
  category: '',
  retention: '30 days',
  max_size: '500 MB',
  rotation: 'Daily',
  log_level: 'info',
};

export function LogConfig() {
  const [settings, setSettings]             = useState<LogEntry[]>([]);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen]           = useState(false);
  const [editingSetting, setEditingSetting] = useState<LogEntry | null>(null);
  const [formData, setFormData]             = useState<LogForm>(emptyForm);

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      const data = await logConfigsService.list();
      setSettings(Array.isArray(data) ? (data as unknown as LogEntry[]) : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    try {
      setSaving(true);
      const created = await logConfigsService.create(formData as any);
      setSettings(prev => [...prev, created as unknown as LogEntry]);
      setIsAddOpen(false);
      resetForm();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!editingSetting) return;
    try {
      setSaving(true);
      const updated = await logConfigsService.update(editingSetting.id, formData as any);
      setSettings(prev => prev.map(s => s.id === (updated as unknown as LogEntry).id ? (updated as unknown as LogEntry) : s));
      setEditingSetting(null);
      resetForm();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this log configuration?')) return;
    try {
      await logConfigsService.remove(id);
      setSettings(prev => prev.filter(s => s.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  function resetForm() { setFormData(emptyForm); }

  function openEdit(s: LogEntry) {
    setEditingSetting(s);
    setFormData({
      category: s.category,
      retention: s.retention,
      max_size: s.maxSize,
      rotation: s.rotation,
      log_level: s.level,
    });
  }

  const LogModal = ({
    isOpen, onClose, onSave, title,
  }: {
    isOpen: boolean; onClose: () => void; onSave: () => void; title: string;
  }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-lg w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <input
                type="text"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="System Logs"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Log Level</label>
              <select
                value={formData.log_level}
                onChange={e => setFormData({ ...formData, log_level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {['info', 'debug', 'warning', 'error'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Retention Period</label>
              <input
                type="text"
                value={formData.retention}
                onChange={e => setFormData({ ...formData, retention: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="30 days"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Size</label>
              <input
                type="text"
                value={formData.max_size}
                onChange={e => setFormData({ ...formData, max_size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="500 MB"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rotation</label>
              <select
                value={formData.rotation}
                onChange={e => setFormData({ ...formData, rotation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {['Hourly', 'Daily', 'Weekly', 'Monthly'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={onSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between">
          {error}
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Log Retention Settings</h3>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Add Setting
          </button>
        </div>

        {settings.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            No log configurations yet. Click "Add Setting" to get started.
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Level</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Retention</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Max Size</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Rotation</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {settings.map(s => (
                  <tr key={s.id} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />{s.category}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        s.level === 'error'   ? 'bg-red-100 text-red-700' :
                        s.level === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                        s.level === 'debug'   ? 'bg-purple-100 text-purple-700' :
                                                'bg-blue-100 text-blue-700'
                      }`}>{s.level}</span>
                    </td>
                    <td className="px-4 py-3">{s.retention}</td>
                    <td className="px-4 py-3">{s.maxSize}</td>
                    <td className="px-4 py-3">{s.rotation}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(s)} className="p-1 hover:bg-blue-50 rounded">
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="p-1 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LogModal
        isOpen={isAddOpen}
        onClose={() => { setIsAddOpen(false); resetForm(); }}
        onSave={handleAdd}
        title="Add Log Configuration"
      />
      <LogModal
        isOpen={editingSetting !== null}
        onClose={() => { setEditingSetting(null); resetForm(); }}
        onSave={handleUpdate}
        title="Edit Log Configuration"
      />
    </div>
  );
}
