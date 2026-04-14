import { useState, useEffect } from 'react';
import { FolderGit, Upload, GitBranch, Tag, Edit, Trash2, X, Save, Loader2 } from 'lucide-react';
import { modelConfigsService, ModelConfig, ModelConfigPayload } from '../../../services/modelConfigs';

const emptyForm: ModelConfigPayload = { name: '', version: '1.0.0', size: '', model_type: '', accuracy: '', framework: '', description: '', status: 'testing' };

export function ModelRepoConfig() {
  const [models, setModels]             = useState<ModelConfig[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingModel, setEditingModel]     = useState<ModelConfig | null>(null);
  const [formData, setFormData]         = useState<ModelConfigPayload>(emptyForm);

  useEffect(() => { fetchModels(); }, []);

  async function fetchModels() {
    try { setLoading(true); const data = await modelConfigsService.list(); setModels(Array.isArray(data) ? data : []); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleAdd() {
    try {
      setSaving(true);
      const created = await modelConfigsService.create(formData);
      setModels(prev => [...prev, created]);
      setIsAddModalOpen(false); resetForm();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleUpdate() {
    if (!editingModel) return;
    try {
      setSaving(true);
      const updated = await modelConfigsService.update(editingModel.id, formData);
      setModels(prev => prev.map(m => m.id === updated.id ? updated : m));
      setEditingModel(null); resetForm();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this model?')) return;
    try { await modelConfigsService.remove(id); setModels(prev => prev.filter(m => m.id !== id)); }
    catch (e: any) { setError(e.message); }
  }

  function resetForm() { setFormData(emptyForm); }

  function openEditModal(m: ModelConfig) {
    setEditingModel(m);
    setFormData({ name: m.name, version: m.version, size: m.size, model_type: m.type, accuracy: m.accuracy, framework: m.framework, description: m.description, status: m.status });
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
            <div>
              <label className="block text-sm font-medium mb-1">Model Name *</label>
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="ppe-detector-v3" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Version</label>
              <input type="text" value={formData.version} onChange={e => setFormData({ ...formData, version: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="3.2.1" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Model Type</label>
              <select value={formData.model_type} onChange={e => setFormData({ ...formData, model_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                {['','YOLOv8','YOLOv7','YOLOv5','RCNN','ResNet50','MobileNet','EfficientNet'].map(t => <option key={t} value={t}>{t || 'Select Type'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Framework</label>
              <select value={formData.framework} onChange={e => setFormData({ ...formData, framework: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                {['','PyTorch','TensorFlow','TensorFlow Lite','ONNX','OpenVINO'].map(f => <option key={f} value={f}>{f || 'Select Framework'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Size</label>
              <input type="text" value={formData.size} onChange={e => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="245 MB" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Accuracy</label>
              <input type="text" value={formData.accuracy} onChange={e => setFormData({ ...formData, accuracy: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="96.5%" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as ModelConfig['status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="active">Active</option>
                <option value="testing">Testing</option>
                <option value="deprecated">Deprecated</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={3} placeholder="Model description..." />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onSave} disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Model
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
          <h3 className="text-lg font-semibold">Model Repository</h3>
          <p className="text-sm text-gray-600">{models.length} models</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Upload className="w-4 h-4" /> Upload Model
        </button>
      </div>
      <div className="grid gap-4">
        {models.length === 0 && (
          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            No models in repository yet. Click "Upload Model" to add one.
          </div>
        )}
        {models.map(m => (
          <div key={m.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex gap-4 flex-1">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FolderGit className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-semibold">{m.name}</h4>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${m.status === 'active' ? 'bg-green-100 text-green-700' : m.status === 'testing' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                      {m.status}
                    </span>
                  </div>
                  {m.description && <p className="text-sm text-gray-600 mb-1">{m.description}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditModal(m)} className="p-2 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4 text-blue-600" /></button>
                <button onClick={() => handleDelete(m.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-600" /></button>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-4 text-sm">
              <div><div className="flex items-center gap-1 text-gray-500 text-xs mb-1"><GitBranch className="w-3 h-3" /> Version</div><span className="font-mono">{m.version}</span></div>
              <div><div className="flex items-center gap-1 text-gray-500 text-xs mb-1"><Tag className="w-3 h-3" /> Type</div><span>{m.type || 'N/A'}</span></div>
              <div><div className="text-gray-500 text-xs mb-1">Framework</div><span>{m.framework || 'N/A'}</span></div>
              <div><div className="text-gray-500 text-xs mb-1">Size</div><span>{m.size || 'N/A'}</span></div>
              <div><div className="text-gray-500 text-xs mb-1">Accuracy</div><span className="font-semibold text-green-600">{m.accuracy || 'N/A'}</span></div>
            </div>
          </div>
        ))}
      </div>
      <FormModal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); resetForm(); }} onSave={handleAdd} title="Upload New Model" />
      <FormModal isOpen={editingModel !== null} onClose={() => { setEditingModel(null); resetForm(); }} onSave={handleUpdate} title="Edit Model" />
    </div>
  );
}
