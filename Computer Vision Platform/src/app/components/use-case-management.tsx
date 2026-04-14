import { useState, useEffect } from 'react';
import { Lightbulb, Plus, Edit2, Trash2, Workflow, ChevronLeft, FolderKanban, Loader2, X } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useCasesService, UseCase, UseCasePayload } from '../../services/useCases';
import { projectsService, Project } from '../../services/projects';

const emptyForm: UseCasePayload = {
  name: '',
  description: '',
  type: 'safety',
  priority: 'medium',
  status: 'development',
};

export function UseCaseManagement() {
  const { projectId } = useParams<{ projectId: string }>();
  const numericProjectId = Number(projectId);

  const [project, setProject]         = useState<Project | null>(null);
  const [useCases, setUseCases]       = useState<UseCase[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUseCase, setEditingUseCase] = useState<UseCase | null>(null);
  const [formData, setFormData]       = useState<UseCasePayload>(emptyForm);

  useEffect(() => {
    if (!numericProjectId) return;
    Promise.all([
      projectsService.get(numericProjectId).catch(() => null),
      useCasesService.list(numericProjectId),
    ]).then(([proj, ucs]) => {
      setProject(proj);
      setUseCases(Array.isArray(ucs) ? ucs : []);
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [numericProjectId]);

  const handleOpenModal = (useCase?: UseCase) => {
    if (useCase) {
      setEditingUseCase(useCase);
      setFormData({
        name: useCase.name,
        description: useCase.description,
        type: useCase.type,
        priority: useCase.priority,
        status: useCase.status,
      });
    } else {
      setEditingUseCase(null);
      setFormData(emptyForm);
    }
    setIsModalOpen(true);
  };

  const handleSaveUseCase = async () => {
    if (!formData.name?.trim() || !numericProjectId) return;
    try {
      setSaving(true);
      if (editingUseCase) {
        const updated = await useCasesService.update(numericProjectId, editingUseCase.id, formData);
        setUseCases(prev => prev.map(uc => uc.id === updated.id ? updated : uc));
      } else {
        const created = await useCasesService.create(numericProjectId, formData);
        setUseCases(prev => [...prev, created]);
      }
      setIsModalOpen(false);
      setEditingUseCase(null);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDeleteUseCase = async (useCaseId: number) => {
    if (!confirm('Are you sure? All workflows under this use case will be removed.')) return;
    try {
      await useCasesService.remove(numericProjectId, useCaseId);
      setUseCases(prev => prev.filter(uc => uc.id !== useCaseId));
    } catch (e: any) { setError(e.message); }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'safety':      return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'quality':     return 'bg-green-100 text-green-700 border-green-200';
      case 'maintenance': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'productivity':return 'bg-amber-100 text-amber-700 border-amber-200';
      default:            return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':      return 'bg-green-100 text-green-700';
      case 'inactive':    return 'bg-gray-100 text-gray-700';
      case 'development': return 'bg-blue-100 text-blue-700';
      default:            return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':   return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low':    return 'bg-blue-100 text-blue-700';
      default:       return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-gray-500">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
    </div>
  );

  const projectName = project?.name ?? `Project #${projectId}`;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between">
          {error}<button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link to="/projects" className="hover:text-purple-600 transition-colors">Projects</Link>
        <ChevronLeft className="w-4 h-4 rotate-180" />
        <span className="font-semibold text-gray-900">{projectName}</span>
      </div>

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 rounded-2xl p-8 shadow-2xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FolderKanban className="w-8 h-8 text-cyan-200" />
                <h2 className="text-3xl font-bold text-white">{projectName}</h2>
              </div>
              <p className="text-cyan-100">Manage use cases and configure workflows for this project</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-6 py-3 bg-white text-cyan-600 rounded-xl hover:bg-cyan-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              <span className="font-semibold">New Use Case</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="text-4xl font-bold mb-2">{useCases.length}</div>
          <div className="text-blue-100 text-sm font-medium">Total Use Cases</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="text-4xl font-bold mb-2">{useCases.filter(uc => uc.status === 'active').length}</div>
          <div className="text-green-100 text-sm font-medium">Active</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="text-4xl font-bold mb-2">{useCases.filter(uc => uc.priority === 'high').length}</div>
          <div className="text-amber-100 text-sm font-medium">High Priority</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="text-4xl font-bold mb-2">{useCases.reduce((sum, uc) => sum + (uc.workflows ?? 0), 0)}</div>
          <div className="text-purple-100 text-sm font-medium">Total Workflows</div>
        </div>
      </div>

      {/* Use Cases List */}
      <div className="grid md:grid-cols-2 gap-6">
        {useCases.map((useCase) => (
          <div key={useCase.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Lightbulb className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{useCase.name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(useCase.status)}`}>
                      {useCase.status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getTypeColor(useCase.type)}`}>
                      {useCase.type}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(useCase.priority)}`}>
                      {useCase.priority} priority
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => handleOpenModal(useCase)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteUseCase(useCase.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4">{useCase.description}</p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>#{useCase.id}</span>
                <span>•</span>
                <span>{useCase.createdAt ? new Date(useCase.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : useCase.createdDate}</span>
              </div>
              <Link
                to={`/projects/${projectId}/use-cases/${useCase.id}/workflows`}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-medium shadow-md"
              >
                <Workflow className="w-4 h-4" />
                {useCase.workflows ?? 0} Workflows
              </Link>
            </div>
          </div>
        ))}

        {useCases.length === 0 && (
          <div className="col-span-2 text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
            <Lightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-600 mb-2">No Use Cases Yet</h3>
            <p className="text-gray-500 mb-4">Create your first use case to get started</p>
            <button
              onClick={() => handleOpenModal()}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg"
            >
              Create Use Case
            </button>
          </div>
        )}
      </div>

      {/* Use Case Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              {editingUseCase ? 'Edit Use Case' : 'Create New Use Case'}
            </h3>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Use Case Name *</label>
                <input
                  type="text"
                  value={formData.name ?? ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition-all"
                  placeholder="e.g., PPE Detection, Quality Inspection"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                <textarea
                  value={formData.description ?? ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition-all"
                  placeholder="Brief description of the use case"
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as UseCase['type'] })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition-all"
                  >
                    <option value="safety">Safety</option>
                    <option value="quality">Quality</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="productivity">Productivity</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Priority *</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as UseCase['priority'] })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition-all"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as UseCase['status'] })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition-all"
                  >
                    <option value="development">Development</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleSaveUseCase}
                disabled={saving || !formData.name?.trim() || !formData.description?.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-700 hover:to-blue-700 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingUseCase ? 'Update Use Case' : 'Create Use Case'}
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
