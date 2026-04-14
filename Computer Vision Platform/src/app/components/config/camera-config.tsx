import { useState, useEffect } from 'react';
import { Plus, Video, Power, Trash2, Edit, X, Save, Loader2 } from 'lucide-react';
import { camerasService, Camera, CameraPayload } from '../../../services/cameras';

const emptyForm: CameraPayload = {
  name: '',
  location: '',
  status: 'active',
  fps: 30,
  resolution: '1920x1080',
  ip_address: '',
  rtsp_url: '',
  hardware_model: '',
};

export function CameraConfig() {
  const [cameras, setCameras]           = useState<Camera[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCamera, setEditingCamera]   = useState<Camera | null>(null);
  const [formData, setFormData]         = useState<CameraPayload>(emptyForm);

  useEffect(() => { fetchCameras(); }, []);

  async function fetchCameras() {
    try {
      setLoading(true);
      const data = await camerasService.list();
      setCameras(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    try {
      setSaving(true);
      const created = await camerasService.create(formData);
      setCameras(prev => [...prev, created]);
      setIsAddModalOpen(false);
      resetForm();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleUpdate() {
    if (!editingCamera) return;
    try {
      setSaving(true);
      const updated = await camerasService.update(editingCamera.id, formData);
      setCameras(prev => prev.map(c => c.id === updated.id ? updated : c));
      setEditingCamera(null);
      resetForm();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this camera?')) return;
    try {
      await camerasService.remove(id);
      setCameras(prev => prev.filter(c => c.id !== id));
    } catch (e: any) { setError(e.message); }
  }

  async function handleToggleStatus(cam: Camera) {
    const next = cam.status === 'active' ? 'inactive' : 'active';
    try {
      await camerasService.setStatus(cam.id, next);
      setCameras(prev => prev.map(c => c.id === cam.id ? { ...c, status: next as Camera['status'] } : c));
    } catch (e: any) { setError(e.message); }
  }

  function resetForm() { setFormData(emptyForm); }

  function openEditModal(camera: Camera) {
    setEditingCamera(camera);
    setFormData({
      name:           camera.name,
      location:       camera.location,
      status:         camera.status === 'error' ? 'inactive' : camera.status,
      fps:            camera.fps,
      resolution:     camera.resolution,
      ip_address:     camera.ip,
      rtsp_url:       camera.rtspUrl,
      hardware_model: camera.model,
    });
  }

  const FormModal = ({ isOpen, onClose, onSave, title }: {
    isOpen: boolean; onClose: () => void; onSave: () => void; title: string;
  }) => {
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
              <label className="block text-sm font-medium mb-1">Camera Name *</label>
              <input type="text" value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Station A - Entry" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input type="text" value={formData.location ?? ''}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Zone A" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">IP Address</label>
              <input type="text" value={formData.ip_address}
                onChange={e => setFormData({ ...formData, ip_address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="192.168.1.101" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">RTSP URL</label>
              <input type="text" value={formData.rtsp_url ?? ''}
                onChange={e => setFormData({ ...formData, rtsp_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="rtsp://192.168.1.101:554/stream" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Resolution</label>
              <select value={formData.resolution}
                onChange={e => setFormData({ ...formData, resolution: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="1920x1080">1920x1080 (FHD)</option>
                <option value="1280x720">1280x720 (HD)</option>
                <option value="2560x1440">2560x1440 (2K)</option>
                <option value="3840x2160">3840x2160 (4K)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">FPS</label>
              <input type="number" value={formData.fps}
                onChange={e => setFormData({ ...formData, fps: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" min="1" max="60" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Camera Model</label>
              <input type="text" value={formData.hardware_model ?? ''}
                onChange={e => setFormData({ ...formData, hardware_model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Hikvision DS-2CD2xx" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onSave} disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Camera
            </button>
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-gray-500">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading cameras...
    </div>
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between">
          {error}
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Camera Configuration</h3>
          <p className="text-sm text-gray-600">{cameras.length} cameras configured</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Camera
        </button>
      </div>

      <div className="grid gap-4">
        {cameras.length === 0 && (
          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            No cameras configured yet. Click "Add Camera" to get started.
          </div>
        )}
        {cameras.map(camera => (
          <div key={camera.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex gap-4 flex-1">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Video className="w-6 h-6 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-semibold">{camera.name}</h4>
                    <button onClick={() => handleToggleStatus(camera)}
                      className={`px-2 py-0.5 text-xs rounded-full cursor-pointer ${
                        camera.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                      <Power className="w-3 h-3 inline mr-1" />
                      {camera.status === 'active' ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">#{camera.id} • {camera.location}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div><span className="font-medium">IP:</span> {camera.ip}</div>
                    <div><span className="font-medium">Resolution:</span> {camera.resolution}</div>
                    <div><span className="font-medium">FPS:</span> {camera.fps}</div>
                    <div><span className="font-medium">Model:</span> {camera.model || 'N/A'}</div>
                  </div>
                  {camera.rtspUrl && (
                    <div className="mt-2 text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">{camera.rtspUrl}</div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditModal(camera)} className="p-2 hover:bg-blue-50 rounded-lg" title="Edit">
                  <Edit className="w-4 h-4 text-blue-600" />
                </button>
                <button onClick={() => handleDelete(camera.id)} className="p-2 hover:bg-red-50 rounded-lg" title="Delete">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <FormModal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); resetForm(); }} onSave={handleAdd} title="Add New Camera" />
      <FormModal isOpen={editingCamera !== null} onClose={() => { setEditingCamera(null); resetForm(); }} onSave={handleUpdate} title="Edit Camera" />
    </div>
  );
}
