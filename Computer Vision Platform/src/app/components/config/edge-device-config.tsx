import { useState, useEffect } from 'react';
import { Plus, Cpu, Activity, HardDrive, Edit, Trash2, X, Save, Loader2 } from 'lucide-react';
import { edgeDevicesService, EdgeDevice, EdgeDevicePayload } from '../../../services/edgeDevices';

const emptyForm: EdgeDevicePayload = {
  name: '', location: '', status: 'online',
  cpu: '0%', memory: '0%', storage: '0%',
  models: 0, ip_address: '', platform: '', gpu_model: '',
};

export function EdgeDeviceConfig() {
  const [devices, setDevices]           = useState<EdgeDevice[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDevice, setEditingDevice]   = useState<EdgeDevice | null>(null);
  const [formData, setFormData]         = useState<EdgeDevicePayload>(emptyForm);

  useEffect(() => { fetchDevices(); }, []);

  async function fetchDevices() {
    try {
      setLoading(true);
      const data = await edgeDevicesService.list();
      setDevices(Array.isArray(data) ? data : []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleAdd() {
    try {
      setSaving(true);
      const created = await edgeDevicesService.create(formData);
      setDevices(prev => [...prev, created]);
      setIsAddModalOpen(false);
      resetForm();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleUpdate() {
    if (!editingDevice) return;
    try {
      setSaving(true);
      const updated = await edgeDevicesService.update(editingDevice.id, formData);
      setDevices(prev => prev.map(d => d.id === updated.id ? updated : d));
      setEditingDevice(null);
      resetForm();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this edge device?')) return;
    try {
      await edgeDevicesService.remove(id);
      setDevices(prev => prev.filter(d => d.id !== id));
    } catch (e: any) { setError(e.message); }
  }

  async function handleToggleStatus(device: EdgeDevice) {
    const next: 'online' | 'offline' = device.status === 'online' ? 'offline' : 'online';
    try {
      await edgeDevicesService.setStatus(device.id, next);
      setDevices(prev => prev.map(d => d.id === device.id ? { ...d, status: next } : d));
    } catch (e: any) { setError(e.message); }
  }

  function resetForm() { setFormData(emptyForm); }

  function openEditModal(device: EdgeDevice) {
    setEditingDevice(device);
    setFormData({
      name: device.name, location: device.location, status: device.status,
      cpu: device.cpu, memory: device.memory, storage: device.storage,
      models: device.models, ip_address: device.ipAddress,
      platform: device.platform, gpu_model: device.gpuModel,
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
            {([
              ['name', 'Device Name *', 'text', 'Edge Node Alpha'],
              ['location', 'Location', 'text', 'Zone A'],
              ['ip_address', 'IP Address', 'text', '192.168.1.201'],
              ['platform', 'Platform', 'text', 'NVIDIA Jetson AGX Xavier'],
              ['gpu_model', 'GPU Model', 'text', 'Xavier'],
              ['cpu', 'CPU Usage', 'text', '45%'],
              ['memory', 'Memory Usage', 'text', '62%'],
              ['storage', 'Storage Usage', 'text', '35%'],
            ] as [keyof EdgeDevicePayload, string, string, string][]).map(([key, label, type, placeholder]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input type={type} value={String(formData[key] ?? '')}
                  onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder={placeholder} />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as 'online' | 'offline' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Models Deployed</label>
              <input type="number" value={formData.models ?? 0}
                onChange={e => setFormData({ ...formData, models: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" min="0" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onSave} disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Device
            </button>
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-gray-500">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading devices...
    </div>
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between">
          {error}<button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Edge Device Configuration</h3>
          <p className="text-sm text-gray-600">{devices.length} devices configured</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Device
        </button>
      </div>

      <div className="grid gap-4">
        {devices.length === 0 && (
          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            No edge devices configured yet. Click "Add Device" to get started.
          </div>
        )}
        {devices.map(device => (
          <div key={device.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex gap-4 flex-1">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-semibold">{device.name}</h4>
                    <button onClick={() => handleToggleStatus(device)}
                      className={`px-2 py-0.5 text-xs rounded-full cursor-pointer ${
                        device.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                      {device.status}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">#{device.id} • {device.location}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                    <div><span className="font-medium">IP:</span> {device.ipAddress}</div>
                    <div><span className="font-medium">Platform:</span> {device.platform || 'N/A'}</div>
                    <div><span className="font-medium">GPU:</span> {device.gpuModel || 'N/A'}</div>
                    <div><span className="font-medium">Models:</span> {device.models} deployed</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditModal(device)} className="p-2 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4 text-blue-600" /></button>
                <button onClick={() => handleDelete(device.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-600" /></button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {([['cpu', 'CPU Usage', Activity], ['memory', 'Memory', HardDrive], ['storage', 'Storage', HardDrive]] as const).map(([key, label, Icon]) => (
                <div key={key}>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Icon className="w-4 h-4" />{label}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full ${
                        parseInt(device[key]) > 70 ? 'bg-red-500' : parseInt(device[key]) > 50 ? 'bg-yellow-500' : key === 'storage' ? 'bg-blue-500' : 'bg-green-500'
                      }`} style={{ width: device[key] }} />
                    </div>
                    <span className="text-sm font-medium">{device[key]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <FormModal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); resetForm(); }} onSave={handleAdd} title="Add New Edge Device" />
      <FormModal isOpen={editingDevice !== null} onClose={() => { setEditingDevice(null); resetForm(); }} onSave={handleUpdate} title="Edit Edge Device" />
    </div>
  );
}
