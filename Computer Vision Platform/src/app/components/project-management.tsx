import { useState, useEffect } from 'react';
import { FolderKanban, Plus, Edit2, Trash2, Eye, ChevronRight, Building2, MapPin, Settings as SettingsIcon, Loader2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { projectsService, Project, projectToPayload } from '../../services/projects';

type FormState = {
  name: string;
  description: string;
  businessHierarchy: { [key: string]: string };
  geographyHierarchy: { [key: string]: string };
  status: 'active' | 'inactive' | 'planning';
};

const emptyForm: FormState = {
  name: '',
  description: '',
  businessHierarchy: {},
  geographyHierarchy: {},
  status: 'planning',
};

const businessLevels = ['Company', 'Manufacturing Unit', 'Product Line'];
const geographyLevels = ['Country', 'State/Province', 'City', 'Location/Site'];

export function ProjectManagement() {
  const [projects, setProjects]         = useState<Project[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData]         = useState<FormState>(emptyForm);

  useEffect(() => { fetchProjects(); }, []);

  async function fetchProjects() {
    try {
      setLoading(true);
      const data = await projectsService.list();
      setProjects(Array.isArray(data) ? data : []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description,
        businessHierarchy: { ...project.businessHierarchy },
        geographyHierarchy: { ...project.geographyHierarchy },
        status: project.status,
      });
    } else {
      setEditingProject(null);
      setFormData(emptyForm);
    }
    setIsModalOpen(true);
  };

  const handleSaveProject = async () => {
    if (!formData.name.trim()) return;
    try {
      setSaving(true);
      const payload = projectToPayload(formData);
      if (editingProject) {
        const updated = await projectsService.update(editingProject.id, payload);
        setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await projectsService.create(payload);
        setProjects(prev => [...prev, created]);
      }
      setIsModalOpen(false);
      setEditingProject(null);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('Are you sure you want to delete this project? All use cases and workflows will be removed.')) return;
    try {
      await projectsService.remove(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (e: any) { setError(e.message); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':   return 'bg-green-100 text-green-700 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'planning': return 'bg-blue-100 text-blue-700 border-blue-200';
      default:         return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-gray-500">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading projects...
    </div>
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between">
          {error}<button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-8 shadow-2xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Project Management</h2>
              <p className="text-violet-100">Organize projects within your business and geography hierarchy</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-6 py-3 bg-white text-violet-600 rounded-xl hover:bg-violet-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              <span className="font-semibold">New Project</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="text-4xl font-bold mb-2">{projects.filter(p => p.status === 'active').length}</div>
          <div className="text-green-100 text-sm font-medium">Active Projects</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="text-4xl font-bold mb-2">{projects.filter(p => p.status === 'planning').length}</div>
          <div className="text-blue-100 text-sm font-medium">In Planning</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="text-4xl font-bold mb-2">{projects.reduce((sum, p) => sum + (p.useCases ?? 0), 0)}</div>
          <div className="text-purple-100 text-sm font-medium">Total Use Cases</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="text-4xl font-bold mb-2">{projects.length}</div>
          <div className="text-amber-100 text-sm font-medium">Total Projects</div>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {projects.length === 0 && (
          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            No projects yet. Click "New Project" to get started.
          </div>
        )}
        {projects.map((project) => (
          <div key={project.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 border border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <FolderKanban className="w-8 h-8 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-800">{project.name}</h3>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                    <span className="text-sm text-gray-500">#{project.id}</span>
                  </div>
                  <p className="text-gray-600 mb-4">{project.description}</p>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                      <div className="flex items-center gap-2 text-sm font-bold text-blue-900 mb-3">
                        <Building2 className="w-4 h-4" />
                        Business Hierarchy
                      </div>
                      <div className="space-y-2">
                        {Object.entries(project.businessHierarchy ?? {}).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2 text-sm">
                            <ChevronRight className="w-3 h-3 text-blue-500" />
                            <span className="text-gray-600 font-medium">{key}:</span>
                            <span className="text-gray-900">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                      <div className="flex items-center gap-2 text-sm font-bold text-green-900 mb-3">
                        <MapPin className="w-4 h-4" />
                        Geography Hierarchy
                      </div>
                      <div className="space-y-2">
                        {Object.entries(project.geographyHierarchy ?? {}).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2 text-sm">
                            <ChevronRight className="w-3 h-3 text-green-500" />
                            <span className="text-gray-600 font-medium">{key}:</span>
                            <span className="text-gray-900">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Created: {project.createdAt ? new Date(project.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : project.createdDate}</span>
                    <span>•</span>
                    <span className="font-semibold text-purple-600">{project.useCases ?? 0} Use Cases</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 flex-shrink-0">
                <Link
                  to={`/projects/${project.id}/use-cases`}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all font-medium"
                >
                  <Eye className="w-4 h-4" />
                  View Use Cases
                </Link>
                <button
                  onClick={() => handleOpenModal(project)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <Link
                  to={`/projects/${project.id}/settings`}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-all font-medium"
                >
                  <SettingsIcon className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={() => handleDeleteProject(project.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm overflow-y-auto p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full shadow-2xl my-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              {editingProject ? 'Edit Project' : 'Create New Project'}
            </h3>

            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Project Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                  placeholder="Brief description of the project"
                  rows={3}
                />
              </div>

              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h4 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Business Hierarchy *
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {businessLevels.map((level) => (
                    <div key={level}>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{level}</label>
                      <input
                        type="text"
                        value={formData.businessHierarchy[level] || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          businessHierarchy: { ...formData.businessHierarchy, [level]: e.target.value }
                        })}
                        className="w-full px-4 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-500 transition-all"
                        placeholder={`Select ${level}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <h4 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Geography Hierarchy *
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {geographyLevels.map((level) => (
                    <div key={level}>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{level}</label>
                      <input
                        type="text"
                        value={formData.geographyHierarchy[level] || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          geographyHierarchy: { ...formData.geographyHierarchy, [level]: e.target.value }
                        })}
                        className="w-full px-4 py-2 border-2 border-green-200 rounded-lg focus:border-green-500 transition-all"
                        placeholder={`Select ${level}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleSaveProject}
                disabled={saving || !formData.name.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingProject ? 'Update Project' : 'Create Project'}
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
