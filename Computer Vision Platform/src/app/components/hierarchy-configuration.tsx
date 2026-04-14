import { useState } from 'react';
import { Building2, MapPin, Plus, Edit2, Trash2, Save, X, ChevronRight, GripVertical } from 'lucide-react';

interface HierarchyLevel {
  id: string;
  name: string;
  order: number;
}

interface HierarchyNode {
  id: string;
  levelId: string;
  name: string;
  parentId?: string;
  description: string;
}

const initialBusinessLevels: HierarchyLevel[] = [
  { id: 'bl-1', name: 'Company', order: 1 },
  { id: 'bl-2', name: 'Manufacturing Unit', order: 2 },
  { id: 'bl-3', name: 'Product Line', order: 3 },
];

const initialGeographyLevels: HierarchyLevel[] = [
  { id: 'gl-1', name: 'Country', order: 1 },
  { id: 'gl-2', name: 'State/Province', order: 2 },
  { id: 'gl-3', name: 'City', order: 3 },
  { id: 'gl-4', name: 'Location/Site', order: 4 },
];

const initialBusinessNodes: HierarchyNode[] = [
  { id: 'bn-1', levelId: 'bl-1', name: 'TechCorp Industries', description: 'Parent company' },
  { id: 'bn-2', levelId: 'bl-2', name: 'Manufacturing Plant A', parentId: 'bn-1', description: 'Primary manufacturing facility' },
  { id: 'bn-3', levelId: 'bl-2', name: 'Manufacturing Plant B', parentId: 'bn-1', description: 'Secondary facility' },
  { id: 'bn-4', levelId: 'bl-3', name: 'Electronic Components', parentId: 'bn-2', description: 'Electronics production' },
  { id: 'bn-5', levelId: 'bl-3', name: 'Assembly Line', parentId: 'bn-2', description: 'Final assembly' },
];

const initialGeographyNodes: HierarchyNode[] = [
  { id: 'gn-1', levelId: 'gl-1', name: 'United States', description: 'USA operations' },
  { id: 'gn-2', levelId: 'gl-2', name: 'California', parentId: 'gn-1', description: 'West coast operations' },
  { id: 'gn-3', levelId: 'gl-2', name: 'Texas', parentId: 'gn-1', description: 'Central operations' },
  { id: 'gn-4', levelId: 'gl-3', name: 'San Jose', parentId: 'gn-2', description: 'Bay area' },
  { id: 'gn-5', levelId: 'gl-4', name: 'Plant A - Building 1', parentId: 'gn-4', description: 'Main facility' },
];

export function HierarchyConfiguration() {
  const [businessLevels, setBusinessLevels] = useState<HierarchyLevel[]>(initialBusinessLevels);
  const [geographyLevels, setGeographyLevels] = useState<HierarchyLevel[]>(initialGeographyLevels);
  const [businessNodes, setBusinessNodes] = useState<HierarchyNode[]>(initialBusinessNodes);
  const [geographyNodes, setGeographyNodes] = useState<HierarchyNode[]>(initialGeographyNodes);
  
  const [activeTab, setActiveTab] = useState<'business' | 'geography'>('business');
  const [isAddLevelModalOpen, setIsAddLevelModalOpen] = useState(false);
  const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeDescription, setNewNodeDescription] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [editLevelName, setEditLevelName] = useState('');

  const currentLevels = activeTab === 'business' ? businessLevels : geographyLevels;
  const currentNodes = activeTab === 'business' ? businessNodes : geographyNodes;

  const handleAddLevel = () => {
    if (!newLevelName.trim()) return;

    const newLevel: HierarchyLevel = {
      id: `${activeTab === 'business' ? 'bl' : 'gl'}-${Date.now()}`,
      name: newLevelName,
      order: currentLevels.length + 1,
    };

    if (activeTab === 'business') {
      setBusinessLevels([...businessLevels, newLevel]);
    } else {
      setGeographyLevels([...geographyLevels, newLevel]);
    }

    setNewLevelName('');
    setIsAddLevelModalOpen(false);
  };

  const handleDeleteLevel = (levelId: string) => {
    if (!confirm('Are you sure? This will delete all nodes under this level.')) return;

    if (activeTab === 'business') {
      setBusinessLevels(businessLevels.filter(l => l.id !== levelId));
      setBusinessNodes(businessNodes.filter(n => n.levelId !== levelId));
    } else {
      setGeographyLevels(geographyLevels.filter(l => l.id !== levelId));
      setGeographyNodes(geographyNodes.filter(n => n.levelId !== levelId));
    }
  };

  const handleUpdateLevel = (levelId: string) => {
    if (!editLevelName.trim()) return;

    if (activeTab === 'business') {
      setBusinessLevels(businessLevels.map(l => 
        l.id === levelId ? { ...l, name: editLevelName } : l
      ));
    } else {
      setGeographyLevels(geographyLevels.map(l => 
        l.id === levelId ? { ...l, name: editLevelName } : l
      ));
    }

    setEditingLevelId(null);
    setEditLevelName('');
  };

  const handleAddNode = () => {
    if (!newNodeName.trim() || !selectedLevelId) return;

    const newNode: HierarchyNode = {
      id: `${activeTab === 'business' ? 'bn' : 'gn'}-${Date.now()}`,
      levelId: selectedLevelId,
      name: newNodeName,
      parentId: selectedParentId || undefined,
      description: newNodeDescription,
    };

    if (activeTab === 'business') {
      setBusinessNodes([...businessNodes, newNode]);
    } else {
      setGeographyNodes([...geographyNodes, newNode]);
    }

    setNewNodeName('');
    setNewNodeDescription('');
    setSelectedLevelId('');
    setSelectedParentId('');
    setIsAddNodeModalOpen(false);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!confirm('Are you sure? This will delete all child nodes.')) return;

    const deleteNodeAndChildren = (id: string, nodes: HierarchyNode[]): HierarchyNode[] => {
      const childIds = nodes.filter(n => n.parentId === id).map(n => n.id);
      let filtered = nodes.filter(n => n.id !== id);
      childIds.forEach(childId => {
        filtered = deleteNodeAndChildren(childId, filtered);
      });
      return filtered;
    };

    if (activeTab === 'business') {
      setBusinessNodes(deleteNodeAndChildren(nodeId, businessNodes));
    } else {
      setGeographyNodes(deleteNodeAndChildren(nodeId, geographyNodes));
    }
  };

  const getNodesByLevel = (levelId: string) => {
    return currentNodes.filter(n => n.levelId === levelId);
  };

  const getParentNode = (parentId?: string) => {
    if (!parentId) return null;
    return currentNodes.find(n => n.id === parentId);
  };

  const getPossibleParents = (levelId: string) => {
    const levelOrder = currentLevels.find(l => l.id === levelId)?.order || 0;
    const parentLevel = currentLevels.find(l => l.order === levelOrder - 1);
    if (!parentLevel) return [];
    return currentNodes.filter(n => n.levelId === parentLevel.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 shadow-2xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white mb-2">Hierarchy Configuration</h2>
          <p className="text-indigo-100">Configure business and geography hierarchies for your organization</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 bg-white rounded-xl p-2 shadow-md border border-gray-100">
        <button
          onClick={() => setActiveTab('business')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'business'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Building2 className="w-5 h-5" />
          Business Hierarchy
        </button>
        <button
          onClick={() => setActiveTab('geography')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'geography'
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <MapPin className="w-5 h-5" />
          Geography Hierarchy
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Hierarchy Levels */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">Hierarchy Levels</h3>
            <button
              onClick={() => setIsAddLevelModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              Add Level
            </button>
          </div>

          <div className="space-y-3">
            {currentLevels.sort((a, b) => a.order - b.order).map((level, idx) => (
              <div key={level.id} className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all">
                <GripVertical className="w-5 h-5 text-gray-400" />
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  {editingLevelId === level.id ? (
                    <input
                      type="text"
                      value={editLevelName}
                      onChange={(e) => setEditLevelName(e.target.value)}
                      className="flex-1 px-3 py-2 border-2 border-blue-500 rounded-lg focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <span className="font-semibold text-gray-800">{level.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {editingLevelId === level.id ? (
                    <>
                      <button
                        onClick={() => handleUpdateLevel(level.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditingLevelId(null); setEditLevelName(''); }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEditingLevelId(level.id); setEditLevelName(level.name); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLevel(level.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hierarchy Nodes */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">Hierarchy Structure</h3>
            <button
              onClick={() => setIsAddNodeModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              Add Node
            </button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {currentLevels.sort((a, b) => a.order - b.order).map((level) => {
              const nodes = getNodesByLevel(level.id);
              if (nodes.length === 0) return null;

              return (
                <div key={level.id} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-700 px-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    {level.name}
                  </div>
                  {nodes.map((node) => {
                    const parent = getParentNode(node.parentId);
                    return (
                      <div key={node.id} className="ml-4 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-800 mb-1">{node.name}</div>
                            {parent && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                <ChevronRight className="w-3 h-3" />
                                Under: {parent.name}
                              </div>
                            )}
                            <div className="text-xs text-gray-600">{node.description}</div>
                          </div>
                          <button
                            onClick={() => handleDeleteNode(node.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Level Modal */}
      {isAddLevelModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Add Hierarchy Level</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Level Name *</label>
                <input
                  type="text"
                  value={newLevelName}
                  onChange={(e) => setNewLevelName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="e.g., Department, Division, etc."
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddLevel}
                disabled={!newLevelName.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Level
              </button>
              <button
                onClick={() => { setIsAddLevelModalOpen(false); setNewLevelName(''); }}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Node Modal */}
      {isAddNodeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Add Hierarchy Node</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Level *</label>
                <select
                  value={selectedLevelId}
                  onChange={(e) => { setSelectedLevelId(e.target.value); setSelectedParentId(''); }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  <option value="">Select a level</option>
                  {currentLevels.map(level => (
                    <option key={level.id} value={level.id}>{level.name}</option>
                  ))}
                </select>
              </div>
              
              {selectedLevelId && getPossibleParents(selectedLevelId).length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Parent Node</label>
                  <select
                    value={selectedParentId}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  >
                    <option value="">None (Top Level)</option>
                    {getPossibleParents(selectedLevelId).map(node => (
                      <option key={node.id} value={node.id}>{node.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Node Name *</label>
                <input
                  type="text"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="e.g., Plant A, California, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={newNodeDescription}
                  onChange={(e) => setNewNodeDescription(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="Brief description..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddNode}
                disabled={!newNodeName.trim() || !selectedLevelId}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Node
              </button>
              <button
                onClick={() => {
                  setIsAddNodeModalOpen(false);
                  setNewNodeName('');
                  setNewNodeDescription('');
                  setSelectedLevelId('');
                  setSelectedParentId('');
                }}
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
