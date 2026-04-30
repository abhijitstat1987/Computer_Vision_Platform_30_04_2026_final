import React, { useEffect, useState } from 'react';
import {
  fetchAgenticFlows,
  createAgenticFlow,
  executeAgenticFlow,
  approveAgenticStep,
  AgenticFlow,
  AgenticFlowStep
} from '../../services/agenticFlows';

const defaultStep = () => ({
  id: 0,
  name: '',
  type: 'task',
  config: {},
  depends_on: [],
  status: 'pending',
  result: {}
});

const AgenticFlowDashboard: React.FC = () => {
  const [flows, setFlows] = useState<AgenticFlow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<AgenticFlow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newSteps, setNewSteps] = useState<AgenticFlowStep[]>([{ ...defaultStep(), id: 1 }]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAgenticFlows().then(setFlows).catch(() => setError('Failed to load flows'));
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      const flow = await createAgenticFlow({
        name: newFlowName,
        created_by: 'user',
        steps: newSteps.map((s, i) => ({ ...s, id: i + 1 }))
      });
      setFlows([...flows, flow]);
      setShowCreate(false);
      setNewFlowName('');
      setNewSteps([{ ...defaultStep(), id: 1 }]);
    } catch {
      setError('Failed to create flow');
    }
    setCreating(false);
  };

  const handleExecute = async (flow: AgenticFlow) => {
    try {
      const updated = await executeAgenticFlow(flow.id);
      setFlows(flows.map(f => (f.id === flow.id ? updated : f)));
      setSelectedFlow(updated);
    } catch {
      setError('Failed to execute flow');
    }
  };

  const handleApprove = async (step: AgenticFlowStep) => {
    if (!selectedFlow) return;
    try {
      const updated = await approveAgenticStep(selectedFlow.id, step.id);
      setFlows(flows.map(f => (f.id === selectedFlow.id ? updated : f)));
      setSelectedFlow(updated);
    } catch {
      setError('Failed to approve step');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Agentic Flow Orchestration</h2>
      {error && <div className="bg-red-100 text-red-700 p-2 mb-2 rounded">{error}</div>}
      <button className="mb-4 px-4 py-2 bg-blue-600 text-white rounded" onClick={() => setShowCreate(true)}>
        + New Agentic Flow
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="font-semibold mb-2">Flows</h3>
          <ul className="bg-white rounded shadow divide-y">
            {flows.map(flow => (
              <li
                key={flow.id}
                className={`p-4 cursor-pointer ${selectedFlow?.id === flow.id ? 'bg-blue-50' : ''}`}
                onClick={() => setSelectedFlow(flow)}
              >
                <span className="font-medium">{flow.name}</span>
                <span className="ml-2 text-xs text-gray-500">[{flow.status}]</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          {selectedFlow && (
            <div className="bg-gray-50 rounded p-4">
              <h4 className="font-semibold mb-2">{selectedFlow.name} - Steps</h4>
              <ul className="mb-2">
                {selectedFlow.steps.map(step => (
                  <li key={step.id} className="mb-1 flex items-center gap-2">
                    <span className="font-medium">{step.name}</span>
                    <span className="text-xs text-gray-500">[{step.type}]</span>
                    <span className="text-xs px-2 py-1 rounded bg-gray-200">{step.status}</span>
                    {step.status === 'waiting_approval' && (
                      <button
                        className="ml-2 px-2 py-1 bg-green-600 text-white rounded text-xs"
                        onClick={() => handleApprove(step)}
                      >
                        Approve
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <button
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
                onClick={() => handleExecute(selectedFlow)}
                disabled={selectedFlow.status !== 'created' && selectedFlow.status !== 'waiting_approval'}
              >
                Execute Flow
              </button>
            </div>
          )}
        </div>
      </div>
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Create Agentic Flow</h3>
            <input
              className="w-full border rounded px-2 py-1 mb-2"
              placeholder="Flow name"
              value={newFlowName}
              onChange={e => setNewFlowName(e.target.value)}
            />
            <div className="mb-2">
              <span className="font-semibold text-sm">Steps:</span>
              {newSteps.map((step, idx) => (
                <div key={idx} className="flex gap-2 mt-1">
                  <input
                    className="flex-1 border rounded px-2 py-1"
                    placeholder={`Step ${idx + 1} name`}
                    value={step.name}
                    onChange={e => {
                      const updated = [...newSteps];
                      updated[idx].name = e.target.value;
                      setNewSteps(updated);
                    }}
                  />
                  <select
                    className="border rounded px-1"
                    value={step.type}
                    onChange={e => {
                      const updated = [...newSteps];
                      updated[idx].type = e.target.value;
                      setNewSteps(updated);
                    }}
                  >
                    <option value="task">Task</option>
                    <option value="approval">Approval</option>
                    <option value="llm">LLM</option>
                    <option value="deploy">Deploy</option>
                  </select>
                  {newSteps.length > 1 && (
                    <button
                      className="text-red-500"
                      onClick={() => setNewSteps(newSteps.filter((_, i) => i !== idx))}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                className="mt-2 px-2 py-1 bg-gray-200 rounded text-xs"
                onClick={() => setNewSteps([...newSteps, { ...defaultStep(), id: newSteps.length + 1 }])}
              >
                + Add Step
              </button>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                onClick={handleCreate}
                disabled={creating}
              >
                Create
              </button>
              <button
                className="bg-gray-200 px-3 py-1 rounded text-sm"
                onClick={() => setShowCreate(false)}
                disabled={creating}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgenticFlowDashboard;
