import { useState, useEffect } from 'react';
import { Brain, Server, Edit, Trash2, X, Save, Plus, Activity, Loader2 } from 'lucide-react';
import { llmConfigsService, LlmConfig, LlmConfigPayload } from '../../../services/llmConfigs';

const emptyForm: LlmConfigPayload = { name: '', provider: '', size: '', llm_type: '', context_len: '', status: 'available', endpoint: '', description: '' };

export function LLMRepoConfig() {
  const [llms, setLlms]               = useState<LlmConfig[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLLM, setEditingLLM]   = useState<LlmConfig | null>(null);
  const [formData, setFormData]       = useState<LlmConfigPayload>(emptyForm);

  useEffect(() => { fetchLlms(); }, []);

  async function fetchLlms() {
    try { setLoading(true); const data = await llmConfigsService.list(); setLlms(Array.isArray(data) ? data : []); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleAdd() {
    try {
      setSaving(true);
      const created = await llmConfigsService.create(formData);
      setLlms(prev => [...prev, created]);
      setIsAddModalOpen(false); resetForm();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleUpdate() {
    if (!editingLLM) return;
    try {
      setSaving(true);
      const updated = await llmConfigsService.update(editingLLM.id, formData);
      setLlms(prev => prev.map(l => l.id === updated.id ? updated : l));
      setEditingLLM(null); resetForm();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this LLM configuration?')) return;
    try { await llmConfigsService.remove(id); setLlms(prev => prev.filter(l => l.id !== id)); }
    catch (e: any) { setError(e.message); }
  }

  function resetForm() { setFormData(emptyForm); }

  function openEditModal(llm: LlmConfig) {
    setEditingLLM(llm);
    setFormData({ name: llm.name, provider: llm.provider, size: llm.size, llm_type: llm.type, context_len: llm.context, status: llm.status, endpoint: llm.endpoint, description: llm.description });
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Llama-3-8B-Instruct" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Provider</label>
              <input type="text" value={formData.provider} onChange={e => setFormData({ ...formData, provider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Meta" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select value={formData.llm_type} onChange={e => setFormData({ ...formData, llm_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                {['','Instruction','Multimodal','Analysis','General','Code','Embedding'].map(t => <option key={t} value={t}>{t || 'Select Type'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as LlmConfig['status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="deployed">Deployed</option>
                <option value="configured">Configured</option>
                <option value="available">Available</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Size</label>
              <input type="text" value={formData.size} onChange={e => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="4.7 GB or API" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Context Window</label>
              <input type="text" value={formData.context_len} onChange={e => setFormData({ ...formData, context_len: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="8K" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Endpoint</label>
              <input type="text" value={formData.endpoint} onChange={e => setFormData({ ...formData, endpoint: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="llm-01.internal or api.openai.com" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={3} placeholder="Model description and use cases..." />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onSave} disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save LLM
            </button>
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-gray-500"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...</div>;

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between">{error}<button onClick={() => setError(null)}><X className="w-4 h-4" /></button></div>}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">LLM Repository</h3>
            <p className="text-sm text-gray-600">{llms.length} LLM configurations</p>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add LLM
          </button>
        </div>
        <div className="grid gap-4">
          {llms.length === 0 && (
            <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
              No LLM configurations yet. Click "Add LLM" to get started.
            </div>
          )}
          {llms.map(llm => (
            <div key={llm.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex gap-4 flex-1">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Brain className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold">{llm.name}</h4>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        llm.status === 'deployed' ? 'bg-green-100 text-green-700' :
                        llm.status === 'configured' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{llm.status}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{llm.provider || 'N/A'}</p>
                    {llm.description && <p className="text-xs text-gray-500">{llm.description}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-green-50 rounded-lg" title="Test Connection"><Activity className="w-4 h-4 text-green-600" /></button>
                  <button onClick={() => openEditModal(llm)} className="p-2 hover:bg-blue-50 rounded-lg" title="Edit"><Edit className="w-4 h-4 text-blue-600" /></button>
                  <button onClick={() => handleDelete(llm.id)} className="p-2 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4 text-red-600" /></button>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-4 text-sm">
                <div><div className="text-gray-500 text-xs mb-1">Type</div><span>{llm.type || 'N/A'}</span></div>
                <div><div className="text-gray-500 text-xs mb-1">Size</div><span>{llm.size || 'N/A'}</span></div>
                <div><div className="text-gray-500 text-xs mb-1">Context</div><span>{llm.context || 'N/A'}</span></div>
                <div className="col-span-2">
                  <div className="flex items-center gap-1 text-gray-500 text-xs mb-1"><Server className="w-3 h-3" /> Endpoint</div>
                  <span className="font-mono text-xs text-gray-700">{llm.endpoint || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <FormModal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); resetForm(); }} onSave={handleAdd} title="Add New LLM" />
      <FormModal isOpen={editingLLM !== null} onClose={() => { setEditingLLM(null); resetForm(); }} onSave={handleUpdate} title="Edit LLM Configuration" />
    </div>
  );
}
