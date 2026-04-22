import React, { useState } from 'react';
// TypeScript interfaces
interface Agent {
  id: number;
  name: string;
  status: 'Idle' | 'Active';
  description: string;
}

interface Flow {
  id: number;
  name: string;
  steps: string[];
  comments: string[];
}

const defaultGoal = 'Build a fully automated, goal-driven platform.';

const mockAgents: Agent[] = [
  { id: 1, name: 'Auto Creator', status: 'Idle', description: 'Creates new agents and workflows based on goals.' },
  { id: 2, name: 'Orchestrator', status: 'Active', description: 'Coordinates agent actions and task flows.' },
  { id: 3, name: 'Guidance Agent', status: 'Idle', description: 'Provides suggestions and ensures alignment with goals.' },
];

const mockFlows: Flow[] = [
  { id: 1, name: 'Cloud Platform Build', steps: ['Provision Cloud', 'Deploy Services', 'Configure Security'], comments: [] },
  { id: 2, name: 'Model Selection', steps: ['Analyze Data', 'Benchmark Models', 'Select Best Model'], comments: [] },
  { id: 3, name: 'Dynamic Task Flow', steps: ['Define Tasks', 'Assign Agents', 'Monitor Progress'], comments: [] },
];

// Simple error boundary for debugging
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('Agent Dashboard Error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return <div className="p-6 bg-red-100 text-red-800">Dashboard error: {String(this.state.error)}</div>;
    }
    return this.props.children;
  }
}

export const AgentOrchestrationDashboard: React.FC = () => {
  const [flows, setFlows] = useState<Flow[]>(mockFlows);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [comment, setComment] = useState('');
  const [goal, setGoal] = useState(defaultGoal);
  const [goalInput, setGoalInput] = useState(goal);
  const [editingGoal, setEditingGoal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowSteps, setNewFlowSteps] = useState<string[]>(['']);
  const [newFlowAgents, setNewFlowAgents] = useState<number[]>([mockAgents[0].id]);
  // Add a new flow
  const handleCreateFlow = () => {
    if (!newFlowName.trim() || newFlowSteps.some(s => !s.trim())) return;
    const newFlow: Flow = {
      id: Date.now(),
      name: newFlowName,
      steps: newFlowSteps,
      comments: [],
    };
    setFlows([...flows, newFlow]);
    setShowCreateModal(false);
    setNewFlowName('');
    setNewFlowSteps(['']);
    setNewFlowAgents([mockAgents[0].id]);
  };

  // Remove a flow
  const handleDeleteFlow = (flowId: number) => {
    setFlows(flows.filter(f => f.id !== flowId));
    if (selectedFlow && selectedFlow.id === flowId) setSelectedFlow(null);
  };

  // Edit steps in a flow (for simplicity, only allow editing steps for selected flow)
  const handleEditStep = (idx: number, value: string) => {
    if (!selectedFlow) return;
    const updatedSteps = [...selectedFlow.steps];
    updatedSteps[idx] = value;
    const updatedFlow = { ...selectedFlow, steps: updatedSteps };
    setFlows(flows.map(f => f.id === selectedFlow.id ? updatedFlow : f));
    setSelectedFlow(updatedFlow);
  };

  // Assign agent to a step (for selected flow)
  const handleAssignAgent = (stepIdx: number, agentId: number) => {
    // For demo, just log assignment (can be extended to persist agent assignments per step)
    console.log(`Assign agent ${agentId} to step ${stepIdx}`);
  };

  const handleSelectFlow = (flow: Flow) => {
    console.log('Selecting flow:', flow);
    setSelectedFlow(flow);
  };
  const handleAddComment = () => {
    if (!comment.trim() || !selectedFlow) {
      console.log('No comment or no flow selected');
      return;
    }
    setFlows(prevFlows => {
      const updated = prevFlows.map(f => f.id === selectedFlow.id ? { ...f, comments: [...f.comments, comment] } : f);
      console.log('Updated flows:', updated);
      return updated;
    });
    setSelectedFlow({ ...selectedFlow, comments: [...selectedFlow.comments, comment] });
    setComment('');
  };
  const handleGoalSave = () => {
    const newGoal = goalInput.trim() ? goalInput : defaultGoal;
    console.log('Saving goal:', newGoal);
    setGoal(newGoal);
    setEditingGoal(false);
  };

  return (
    <ErrorBoundary>
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Agent Orchestration Dashboard</h2>
      <div className="mb-6 bg-white rounded shadow p-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
        <span className="font-semibold text-gray-700">Goal:</span>
        {editingGoal ? (
          <>
            <input
              className="flex-1 border rounded px-2 py-1 text-sm"
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleGoalSave(); }}
              autoFocus
            />
            <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm" onClick={handleGoalSave}>Save</button>
            <button className="bg-gray-200 px-3 py-1 rounded text-sm" onClick={() => { setEditingGoal(false); setGoalInput(goal); }}>Cancel</button>
          </>
        ) : (
          <>
            <span className="flex-1 text-gray-800 text-md">{goal}</span>
            <button className="bg-gray-100 px-3 py-1 rounded text-sm" onClick={() => setEditingGoal(true)}>Edit</button>
          </>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Create New Flow Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-2">Create New Flow</h3>
              <input
                className="w-full border rounded px-2 py-1 mb-2"
                placeholder="Flow name"
                value={newFlowName}
                onChange={e => setNewFlowName(e.target.value)}
              />
              <div className="mb-2">
                <span className="font-semibold text-sm">Steps:</span>
                {newFlowSteps.map((step, idx) => (
                  <div key={idx} className="flex gap-2 mt-1">
                    <input
                      className="flex-1 border rounded px-2 py-1"
                      placeholder={`Step ${idx + 1}`}
                      value={step}
                      onChange={e => {
                        const updated = [...newFlowSteps];
                        updated[idx] = e.target.value;
                        setNewFlowSteps(updated);
                      }}
                    />
                    <select
                      className="border rounded px-1"
                      value={newFlowAgents[idx]}
                      onChange={e => {
                        const updated = [...newFlowAgents];
                        updated[idx] = Number(e.target.value);
                        setNewFlowAgents(updated);
                      }}
                    >
                      {mockAgents.map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      ))}
                    </select>
                    {newFlowSteps.length > 1 && (
                      <button className="text-red-500" onClick={() => {
                        setNewFlowSteps(newFlowSteps.filter((_, i) => i !== idx));
                        setNewFlowAgents(newFlowAgents.filter((_, i) => i !== idx));
                      }}>✕</button>
                    )}
                  </div>
                ))}
                <button className="mt-2 px-2 py-1 bg-gray-200 rounded text-xs" onClick={() => { setNewFlowSteps([...newFlowSteps, '']); setNewFlowAgents([...newFlowAgents, mockAgents[0].id]); }}>+ Add Step</button>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm" onClick={handleCreateFlow}>Create</button>
                <button className="bg-gray-200 px-3 py-1 rounded text-sm" onClick={() => setShowCreateModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {/* Agents List */}
        <div>
          <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold mb-2">Agents</h3>
            <button className="bg-blue-500 text-white px-3 py-1 rounded text-sm" onClick={() => setShowCreateModal(true)}>+ New Flow</button>
          </div>
          <ul className="bg-white rounded shadow divide-y">
            {mockAgents.map((agent: Agent) => (
              <li key={agent.id} className="p-4 flex flex-col">
                <span className="font-medium">{agent.name} <span className={`ml-2 text-xs px-2 py-1 rounded ${agent.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{agent.status}</span></span>
                <span className="text-gray-500 text-sm">{agent.description}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Flows List & Details */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Automation Flows</h3>
          <ul className="bg-white rounded shadow divide-y mb-4">
            {flows.map((flow: Flow) => (
              <li key={flow.id} className={`p-4 cursor-pointer flex justify-between items-center ${selectedFlow && selectedFlow.id === flow.id ? 'bg-blue-50' : ''}`}
                  onClick={() => handleSelectFlow(flow)}>
                <div>
                  <span className="font-medium">{flow.name}</span>
                  <span className="block text-gray-500 text-sm">{flow.steps.join(' → ')}</span>
                </div>
                <button className="text-red-500 text-xs ml-2" onClick={e => { e.stopPropagation(); handleDeleteFlow(flow.id); }}>Delete</button>
              </li>
            ))}
          </ul>
          {selectedFlow && (
            <div className="bg-gray-50 rounded p-4">
              <h4 className="font-semibold mb-2">{selectedFlow.name} - Steps & Comments</h4>
              <div className="mb-3">
                <span className="font-semibold text-sm">Steps:</span>
                <ul className="mb-2">
                  {selectedFlow.steps.map((step, idx) => (
                    <li key={idx} className="flex items-center gap-2 mb-1">
                      <input
                        className="flex-1 border rounded px-2 py-1 text-sm"
                        value={step}
                        onChange={e => handleEditStep(idx, e.target.value)}
                      />
                      <select
                        className="border rounded px-1 text-sm"
                        onChange={e => handleAssignAgent(idx, Number(e.target.value))}
                        defaultValue={mockAgents[0].id}
                      >
                        {mockAgents.map(agent => (
                          <option key={agent.id} value={agent.id}>{agent.name}</option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mb-2">
                <span className="font-semibold text-sm">Comments:</span>
                <ul className="mb-2 max-h-32 overflow-y-auto">
                  {selectedFlow.comments.length === 0 && <li className="text-gray-400">No comments yet.</li>}
                  {selectedFlow.comments.map((c: string, i: number) => (
                    <li key={i} className="text-gray-700 text-sm mb-1">• {c}</li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <input
                    className="flex-1 border rounded px-2 py-1 text-sm"
                    placeholder="Add your comment..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }}
                  />
                  <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm" onClick={handleAddComment}>Add</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-8 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
        <p className="text-yellow-800 text-sm">
          All agentic flows are dynamically orchestrated to achieve the defined goal. Users can build architectures, deploy platforms, select models, and create multi-step flows, with full transparency and collaboration.
        </p>
      </div>
    </div>
    </ErrorBoundary>
  );
};
