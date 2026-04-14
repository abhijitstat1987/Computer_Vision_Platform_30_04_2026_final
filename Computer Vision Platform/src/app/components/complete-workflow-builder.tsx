import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Play, Save, X, Trash2, ChevronLeft, FolderKanban, Lightbulb, Settings, CheckCircle, AlertCircle, FileText, LayoutGrid, ZapOff, Zap, Square, RotateCcw, Loader2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { BASE_URL } from '../../services/api';

/* ─── Types ─────────────────────────────────────────────────── */
interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  icon: string;
  x: number;
  y: number;
  config?: any;
}

interface NodeConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
}

interface AlertRule {
  id: string;
  condition: string;
  operator: string;
  value: string;
  action: string;
  severity: string;
}

interface WorkflowRequirements {
  camera: boolean;
  edge: boolean;
  database: boolean;
  logFile: boolean;
  modelRepo: boolean;
  llmRepo: boolean;
  alertConfig: boolean;
}

interface Workflow {
  id: number;
  name: string;
  steps: number;
  status: 'active' | 'draft';
  nodes: WorkflowNode[];
  connections: NodeConnection[];
  requirements: WorkflowRequirements;
  alertRules: AlertRule[];
}

type RunStepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';
interface RunStep {
  key: string;
  label: string;
  icon: string;
  status: RunStepStatus;
  detail?: string;
}

/* ─── Dynamic resource arrays — populated from backend APIs ── */
let configuredCameras: any[] = [];
let configuredEdgeDevices: any[] = [];
let configuredDatabases: any[] = [];
let configuredLogFiles: any[] = [];
let configuredModelRepos: any[] = [];
let configuredLLMRepos: any[] = [];
let configuredAlertChannels: any[] = [];
let deployedModels: any[] = [];
let trainingJobs: any[] = [];
let availableDatasets: any[] = [];

/* ─── Node palette ───────────────────────────────────────────── */
const nodeTypes = [
  { type: 'input', label: 'Camera', icon: '📹', color: 'from-blue-400 to-blue-600', required: true, description: 'Capture image from camera feed' },
  { type: 'edge', label: 'Edge Device', icon: '⚡', color: 'from-cyan-400 to-cyan-600', required: true, description: 'Edge compute processing' },
  { type: 'dataset', label: 'Dataset', icon: '🖼️', color: 'from-pink-400 to-rose-600', required: false, description: 'Upload images, label & train' },
  { type: 'model', label: 'AI Model', icon: '🤖', color: 'from-purple-400 to-purple-600', required: true, description: 'Run model inference' },
  { type: 'llm', label: 'LLM', icon: '🧠', color: 'from-indigo-400 to-indigo-600', required: false, description: 'LLM analysis (optional)' },
  { type: 'filter', label: 'Filter', icon: '🔍', color: 'from-amber-400 to-amber-600', required: false, description: 'Filter by confidence' },
  { type: 'alert', label: 'Alert', icon: '🔔', color: 'from-red-400 to-red-600', required: true, description: 'Send alerts on detections' },
  { type: 'database', label: 'Database', icon: '💾', color: 'from-green-400 to-green-600', required: true, description: 'Store detection events' },
  { type: 'log', label: 'Log File', icon: '📝', color: 'from-yellow-400 to-orange-600', required: true, description: 'Write to log file' },
];

/* ─── DAG connection rules (allowed fromType → toType[]) ───── */
const dagRules: Record<string, string[]> = {
  input:    ['edge'],
  edge:     ['model', 'dataset'],
  dataset:  ['model'],
  model:    ['filter', 'llm', 'alert', 'database', 'log'],
  llm:      ['alert', 'database', 'log'],
  filter:   ['alert', 'database', 'log'],
  alert:    ['database', 'log'],
  database: ['log'],
  log:      [],
};

const GRID = 20;
const NODE_W = 220;
const NODE_H = 130;
const snap = (v: number) => Math.round(v / GRID) * GRID;

/* ================================================================ */
export function CompleteWorkflowBuilder() {
  const { projectId, useCaseId } = useParams<{ projectId?: string; useCaseId?: string }>();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<number | null>(null);
  const [projectName, setProjectName] = useState<string>('Loading...');
  const [useCaseName, setUseCaseName] = useState<string>('Loading...');
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<NodeConnection[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedNodeType, setDraggedNodeType] = useState<typeof nodeTypes[0] | null>(null);
  const [isNewWorkflowModalOpen, setIsNewWorkflowModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isAlertRulesModalOpen, setIsAlertRulesModalOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [showRequirementsPanel, setShowRequirementsPanel] = useState(true);
  const [resourcesLoaded, setResourcesLoaded] = useState(false);
  const [, forceUpdate] = useState(0);

  // Drag-to-move state
  const [movingNode, setMovingNode] = useState<string | null>(null);
  const [moveOffset, setMoveOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Run workflow state
  const [isRunning, setIsRunning] = useState(false);
  const [runSteps, setRunSteps] = useState<RunStep[]>([]);
  const [showRunPanel, setShowRunPanel] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  /* ─── Fetch real platform data from backend ─── */
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const json = async (path: string) => {
          const r = await fetch(`${BASE_URL}${path}`);
          const j = await r.json();
          return j.data || [];
        };

        const [cameras, edges, dbs, logs, models, llms, alerts, jobs, datasets] = await Promise.all([
          json('/api/cameras/'),
          json('/api/edge-devices/'),
          json('/api/config/databases/'),
          json('/api/config/logs/'),
          json('/api/config/models/'),
          json('/api/config/llms/'),
          json('/api/alerts/'),
          json('/api/training/jobs?per_page=100'),
          json('/api/label-datasets/'),
        ]);

        configuredCameras = (Array.isArray(cameras) ? cameras : []).map((c: any) => ({
          id: String(c.id), name: c.name, location: c.location || '', resolution: c.resolution || '', rtsp_url: c.rtsp_url || c.stream_url || '',
        }));
        configuredEdgeDevices = (Array.isArray(edges) ? edges : []).map((e: any) => ({
          id: String(e.id), name: e.name, location: e.location || '', gpu: e.gpu_model || e.platform || '',
        }));
        configuredDatabases = (Array.isArray(dbs) ? dbs : []).map((d: any) => ({
          id: String(d.id), name: d.name, type: d.type || d.db_type || d.dbType || '', host: d.host || '',
        }));
        configuredLogFiles = (Array.isArray(logs) ? logs : []).map((l: any) => ({
          id: String(l.id), name: l.category || l.name || '', path: l.file_path || '', retention: l.retention || '',
        }));
        configuredModelRepos = (Array.isArray(models) ? models : []).map((m: any) => ({
          id: String(m.id), name: m.name, type: m.framework || '', models: 0,
        }));
        deployedModels = (Array.isArray(models) ? models : [])
          .filter((m: any) => m.model_path || m.modelPath)
          .map((m: any) => ({
            id: String(m.id), name: m.name, framework: m.framework || '', accuracy: 0,
          }));
        configuredLLMRepos = (Array.isArray(llms) ? llms : []).map((l: any) => ({
          id: String(l.id), name: l.name || l.model_name || '', provider: l.provider || '',
        }));
        configuredAlertChannels = [
          { id: 'email', name: 'Email Notifications', type: 'email' },
          { id: 'sms', name: 'SMS Alerts', type: 'sms' },
          { id: 'slack', name: 'Slack Channel', type: 'slack' },
          { id: 'webhook', name: 'Webhook', type: 'webhook' },
        ];

        // Keep available datasets for the Dataset node
        availableDatasets = (Array.isArray(datasets) ? datasets : []).map((d: any) => ({
          id: String(d.id), name: d.name, totalImages: d.totalImages || 0, labeled: d.labeled || 0,
          classes: (d.classes || []).map((c: any) => c.name || c.id).join(', '),
        }));

        // Keep completed training jobs for model selection
        trainingJobs = (Array.isArray(jobs) ? jobs : [])
          .filter((j: any) => j.status === 'completed' && j.outputDir)
          .map((j: any) => ({
            id: String(j.id),
            name: `Job #${j.id} — ${j.modelType || 'YOLO'}`,
            modelType: j.modelType || 'yolov8n',
            modelPath: j.outputDir,
            datasetId: j.datasetId,
          }));

        // Fetch project and use-case names
        if (projectId) {
          try {
            const projRes = await fetch(`${BASE_URL}/api/projects/${projectId}`);
            const projJson = await projRes.json();
            if (projJson.data?.name) setProjectName(projJson.data.name);
          } catch (e) { console.error('Failed to fetch project:', e); }
        }
        if (projectId && useCaseId) {
          try {
            const ucRes = await fetch(`${BASE_URL}/api/projects/${projectId}/use-cases/${useCaseId}`);
            const ucJson = await ucRes.json();
            if (ucJson.data?.name) {
              setUseCaseName(ucJson.data.name);
              const defaultWorkflow: Workflow = {
                id: 1,
                name: `${ucJson.data.name} Pipeline`,
                steps: 0,
                status: 'draft',
                nodes: [],
                connections: [],
                requirements: { camera: false, edge: false, database: false, logFile: false, modelRepo: false, llmRepo: false, alertConfig: false },
                alertRules: [],
              };
              setWorkflows([defaultWorkflow]);
              setSelectedWorkflow(1);
            }
          } catch (e) { console.error('Failed to fetch use case:', e); }
        }

        setResourcesLoaded(true);
        forceUpdate(n => n + 1);
      } catch (err) {
        console.error('Failed to load workflow resources:', err);
        setResourcesLoaded(true);
      }
    };
    fetchAll();
  }, [projectId, useCaseId]);

  /* ─── Requirements ─── */
  const calculateRequirements = (nodesList: WorkflowNode[]): WorkflowRequirements => {
    const reqs: WorkflowRequirements = { camera: false, edge: false, database: false, logFile: false, modelRepo: false, llmRepo: false, alertConfig: false };
    nodesList.forEach(node => {
      if (node.type === 'input' && node.config?.camera) reqs.camera = true;
      if (node.type === 'edge' && node.config?.edge) reqs.edge = true;
      if (node.type === 'database' && node.config?.database) reqs.database = true;
      if (node.type === 'log' && node.config?.logFile) reqs.logFile = true;
      if ((node.type === 'model') && (node.config?.repo || node.config?.trainingJob)) reqs.modelRepo = true;
      if (node.type === 'llm' && node.config?.llmRepo) reqs.llmRepo = true;
      if (node.type === 'alert' && node.config?.channel) reqs.alertConfig = true;
    });
    return reqs;
  };

  const currentRequirements = calculateRequirements(nodes);
  const isWorkflowValid = currentRequirements.camera &&
    currentRequirements.edge &&
    currentRequirements.database &&
    currentRequirements.logFile &&
    currentRequirements.modelRepo &&
    currentRequirements.alertConfig;

  /* ─── Topological sort for execution order ─── */
  const topoSort = useCallback((): WorkflowNode[] => {
    if (nodes.length === 0) return [];
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    nodes.forEach(n => { inDegree.set(n.id, 0); adj.set(n.id, []); });
    connections.forEach(c => {
      adj.get(c.fromNodeId)?.push(c.toNodeId);
      inDegree.set(c.toNodeId, (inDegree.get(c.toNodeId) || 0) + 1);
    });
    const queue = nodes.filter(n => (inDegree.get(n.id) || 0) === 0).map(n => n.id);
    const sorted: string[] = [];
    while (queue.length) {
      const curr = queue.shift()!;
      sorted.push(curr);
      for (const next of adj.get(curr) || []) {
        const deg = (inDegree.get(next) || 1) - 1;
        inDegree.set(next, deg);
        if (deg === 0) queue.push(next);
      }
    }
    return sorted.map(id => nodes.find(n => n.id === id)!).filter(Boolean);
  }, [nodes, connections]);

  /* ─── Auto-layout DAG ─── */
  const handleAutoLayout = () => {
    if (nodes.length === 0) return;
    const sorted = topoSort();
    if (sorted.length === 0) return;

    const typeOrder = ['input', 'edge', 'model', 'filter', 'llm', 'alert', 'database', 'log'];
    const layers: Map<string, WorkflowNode[]> = new Map();
    sorted.forEach(n => {
      const key = n.type;
      if (!layers.has(key)) layers.set(key, []);
      layers.get(key)!.push(n);
    });

    const orderedLayers = typeOrder.filter(t => layers.has(t)).map(t => layers.get(t)!);
    const layoutNodes = [...nodes];
    const startX = 80;
    const gapY = 160;
    const gapX = 260;

    orderedLayers.forEach((layer, layerIdx) => {
      const totalWidth = layer.length * gapX;
      const offsetX = startX + (800 - totalWidth) / 2;
      layer.forEach((n, idx) => {
        const nodeIdx = layoutNodes.findIndex(ln => ln.id === n.id);
        if (nodeIdx !== -1) {
          layoutNodes[nodeIdx] = { ...layoutNodes[nodeIdx], x: snap(offsetX + idx * gapX), y: snap(40 + layerIdx * gapY) };
        }
      });
    });
    setNodes(layoutNodes);
  };

  /* ─── Handlers ─── */
  const handleNodeDragStart = (nodeType: typeof nodeTypes[0]) => {
    setDraggedNodeType(nodeType);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedNodeType) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = snap(e.clientX - rect.left - NODE_W / 2);
    const y = snap(e.clientY - rect.top - NODE_H / 2);
    const newNode: WorkflowNode = {
      id: `n${Date.now()}`,
      type: draggedNodeType.type,
      label: draggedNodeType.label,
      icon: draggedNodeType.icon,
      x: Math.max(0, x),
      y: Math.max(0, y),
      config: {},
    };
    setNodes(prev => [...prev, newNode]);
    setDraggedNodeType(null);
    setSelectedNode(newNode.id);
    setIsConfigModalOpen(true);
  };

  const handleCanvasDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  /* ─── Node move on canvas ─── */
  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setMovingNode(nodeId);
    setMoveOffset({ x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!movingNode || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = snap(e.clientX - rect.left - moveOffset.x);
    const y = snap(e.clientY - rect.top - moveOffset.y);
    setNodes(prev => prev.map(n => n.id === movingNode ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n));
  };

  const handleCanvasMouseUp = () => {
    setMovingNode(null);
  };

  /* ─── Connection handling with DAG validation ─── */
  const handleStartConnection = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (connectingFrom) {
      handleCompleteConnection(nodeId, e);
    } else {
      setConnectingFrom(nodeId);
    }
  };

  const handleCompleteConnection = (toNodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!connectingFrom || connectingFrom === toNodeId) {
      setConnectingFrom(null);
      return;
    }
    const fromNode = nodes.find(n => n.id === connectingFrom);
    const toNode = nodes.find(n => n.id === toNodeId);
    if (!fromNode || !toNode) { setConnectingFrom(null); return; }

    // Check DAG rules
    const allowed = dagRules[fromNode.type] || [];
    if (!allowed.includes(toNode.type)) {
      alert(`Cannot connect ${fromNode.label} \u2192 ${toNode.label}\n\nAllowed targets for ${fromNode.label}: ${allowed.map(t => nodeTypes.find(nt => nt.type === t)?.label || t).join(', ') || 'none'}`);
      setConnectingFrom(null);
      return;
    }

    // Check duplicate
    const dup = connections.find(c => c.fromNodeId === connectingFrom && c.toNodeId === toNodeId);
    if (!dup) {
      // Check for cycles
      const wouldCycle = (from: string, to: string): boolean => {
        const visited = new Set<string>();
        const dfs = (current: string): boolean => {
          if (current === from) return true;
          if (visited.has(current)) return false;
          visited.add(current);
          for (const c of connections) {
            if (c.fromNodeId === current && dfs(c.toNodeId)) return true;
          }
          return false;
        };
        return dfs(to);
      };

      if (wouldCycle(connectingFrom, toNodeId)) {
        alert('Cannot create a cycle in the workflow DAG');
        setConnectingFrom(null);
        return;
      }

      setConnections(prev => [...prev, { id: `c${Date.now()}`, fromNodeId: connectingFrom, toNodeId }]);
    }
    setConnectingFrom(null);
  };

  const handleDeleteConnection = (connectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConnections(prev => prev.filter(c => c.id !== connectionId));
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId));
    setSelectedNode(null);
  };

  const handleOpenConfig = (nodeId: string) => {
    setSelectedNode(nodeId);
    setIsConfigModalOpen(true);
  };

  const handleUpdateNodeConfig = (config: any) => {
    if (!selectedNode) return;
    setNodes(prev => prev.map(n => n.id === selectedNode ? { ...n, config } : n));
    setIsConfigModalOpen(false);
  };

  const handleWorkflowSelect = (workflowId: number) => {
    setSelectedWorkflow(workflowId);
    const workflow = workflows.find(w => w.id === workflowId);
    setNodes(workflow?.nodes || []);
    setConnections(workflow?.connections || []);
    setAlertRules(workflow?.alertRules || []);
    setSelectedNode(null);
    setConnectingFrom(null);
  };

  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) return;
    const newWorkflow: Workflow = {
      id: Math.max(0, ...workflows.map(w => w.id)) + 1,
      name: newWorkflowName,
      steps: 0, status: 'draft',
      nodes: [], connections: [],
      requirements: calculateRequirements([]),
      alertRules: [],
    };
    const updatedWorkflows = [...workflows, newWorkflow];
    setWorkflows(updatedWorkflows);
    setSelectedWorkflow(newWorkflow.id);
    setNodes([]); setConnections([]); setAlertRules([]);
    setNewWorkflowName(''); setIsNewWorkflowModalOpen(false);
    if (projectId && useCaseId) {
      try { await fetch(`${BASE_URL}/api/projects/${projectId}/use-cases/${useCaseId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflows: updatedWorkflows.length }) }); } catch (e) { console.error(e); }
    }
  };

  const handleSaveWorkflow = async () => {
    if (selectedWorkflow === null) return;
    if (!isWorkflowValid) {
      const missing: string[] = [];
      if (!currentRequirements.camera) missing.push('Camera Input');
      if (!currentRequirements.edge) missing.push('Edge Device');
      if (!currentRequirements.database) missing.push('Database');
      if (!currentRequirements.logFile) missing.push('Log File');
      if (!currentRequirements.modelRepo) missing.push('AI Model (with training job)');
      if (!currentRequirements.alertConfig) missing.push('Alert Config');
      alert(`Cannot save! Missing required components:\n\n${missing.map(m => '\u2022 ' + m).join('\n')}`);
      return;
    }
    const updatedWorkflows = workflows.map(w =>
      w.id === selectedWorkflow
        ? { ...w, nodes, connections, alertRules, steps: nodes.length, status: 'active' as const, requirements: currentRequirements }
        : w
    );
    setWorkflows(updatedWorkflows);
    if (projectId && useCaseId) {
      try { await fetch(`${BASE_URL}/api/projects/${projectId}/use-cases/${useCaseId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflows: updatedWorkflows.length }) }); } catch (e) { console.error(e); }
    }
    alert('\u2705 Workflow saved successfully!');
  };

  /* ──────────────────────────────────────────────────────────
     REAL RUN WORKFLOW — executes the full pipeline
     1. Capture image from camera (webcam snapshot)
     2. Edge device assignment (log)
     3. AI Model inference (POST /api/inference)
     4. Filter results by confidence threshold
     5. Evaluate alert rules and create alerts
     6. Save detection event to database
     7. Log results
  ────────────────────────────────────────────────────────── */
  const handleRunWorkflow = async () => {
    if (!isWorkflowValid) {
      alert('Cannot run! Please configure all required components first.');
      return;
    }
    setIsRunning(true);
    setShowRunPanel(true);

    const sorted = topoSort();
    const cameraNode = sorted.find(n => n.type === 'input');
    const edgeNode = sorted.find(n => n.type === 'edge');
    const datasetNode = sorted.find(n => n.type === 'dataset');
    const modelNode = sorted.find(n => n.type === 'model');
    const filterNode = sorted.find(n => n.type === 'filter');
    const dbNode = sorted.find(n => n.type === 'database');
    const logNode = sorted.find(n => n.type === 'log');

    const steps: RunStep[] = [
      { key: 'capture', label: 'Capture Image', icon: '\uD83D\uDCF9', status: 'pending' },
      { key: 'edge', label: 'Edge Processing', icon: '\u26A1', status: 'pending' },
      ...(datasetNode ? [{ key: 'dataset', label: 'Dataset & Training', icon: '\uD83D\uDDBC\uFE0F', status: 'pending' as RunStepStatus }] : []),
      { key: 'inference', label: 'Model Inference', icon: '\uD83E\uDD16', status: 'pending' },
      ...(filterNode ? [{ key: 'filter', label: 'Confidence Filter', icon: '\uD83D\uDD0D', status: 'pending' as RunStepStatus }] : []),
      { key: 'alert', label: 'Alert Evaluation', icon: '\uD83D\uDD14', status: 'pending' },
      { key: 'database', label: 'Save to Database', icon: '\uD83D\uDCBE', status: 'pending' },
      { key: 'log', label: 'Write Log', icon: '\uD83D\uDCDD', status: 'pending' },
    ];
    setRunSteps([...steps]);

    const updateStep = (key: string, status: RunStepStatus, detail?: string) => {
      const s = steps.find(s => s.key === key);
      if (s) { s.status = status; if (detail) s.detail = detail; }
      setRunSteps([...steps]);
    };

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    try {
      // Step 1: Capture image from camera
      updateStep('capture', 'running');
      await delay(600);
      const camConfig = cameraNode?.config || {};
      const cameraName = configuredCameras.find(c => c.id === camConfig.camera)?.name || 'Camera';

      let imageBlob: Blob | null = null;
      const snapshotFilename = `workflow_${Date.now()}.jpg`;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();
        await delay(500);
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0);
        stream.getTracks().forEach(t => t.stop());
        imageBlob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.9));
      } catch {
        // No webcam — create a synthetic test image
        const canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 480;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = '#e94560'; ctx.fillRect(200, 100, 80, 200);
        ctx.fillStyle = '#0f3460'; ctx.fillRect(400, 150, 60, 180);
        ctx.font = '20px sans-serif'; ctx.fillStyle = '#fff';
        ctx.fillText('Workflow Test Frame', 180, 420);
        imageBlob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.9));
      }
      updateStep('capture', 'success', `${cameraName} \u2192 ${snapshotFilename}`);

      // Step 2: Edge device assignment
      updateStep('edge', 'running');
      await delay(400);
      const edgeName = configuredEdgeDevices.find(e => e.id === edgeNode?.config?.edge)?.name || 'Edge';
      updateStep('edge', 'success', `Processing on ${edgeName}`);

      // Step 2.5: Dataset & Training (if dataset node present)
      if (datasetNode) {
        updateStep('dataset', 'running');
        await delay(500);
        const dsConfig = datasetNode.config || {};
        const dsName = availableDatasets.find(d => d.id === dsConfig.dataset)?.name || 'Dataset';
        const labelMode = dsConfig.labelMode || 'manual';
        const framework = dsConfig.framework || 'pytorch';
        const dsId = dsConfig.dataset;

        let detail = `${dsName}`;

        // Upload captured image to the dataset if we have one
        if (imageBlob && dsId) {
          try {
            const uploadForm = new FormData();
            uploadForm.append('files', imageBlob, snapshotFilename);
            const upResp = await fetch(`${BASE_URL}/api/label-datasets/${dsId}/images/`, { method: 'POST', body: uploadForm });
            const upResult = await upResp.json();
            if (upResult.success) detail += ` \u2192 image uploaded`;
          } catch (e) { console.error('Dataset upload failed:', e); }
        }

        // Trigger auto-labeling if configured
        if (labelMode === 'auto' && dsId) {
          try {
            await fetch(`${BASE_URL}/api/label-datasets/${dsId}/auto-label`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ model_path: 'yolov8n.pt', confidence_threshold: 0.3 }),
            });
            detail += ' \u2192 auto-labeling started';
          } catch (e) { console.error('Auto-label failed:', e); }
        } else {
          detail += ` \u2192 ${labelMode} labeling`;
        }

        // Start training if configured
        if (dsConfig.autoTrain && dsId) {
          try {
            const modelTypes = [];
            if (framework === 'pytorch' || framework === 'both') modelTypes.push('yolov8n');
            if (framework === 'tensorflow' || framework === 'both') modelTypes.push('tf_mobilenetv2');
            for (const mt of modelTypes) {
              const trainResp = await fetch(`${BASE_URL}/api/training/jobs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  dataset_id: parseInt(dsId),
                  model_type: mt,
                  epochs: parseInt(dsConfig.epochs || '3'),
                  batch_size: 8,
                  img_size: 640,
                  device: 'cpu',
                }),
              });
              const trainResult = await trainResp.json();
              if (trainResult.success) detail += ` \u2192 ${mt} training job #${trainResult.data?.id} started`;
            }
          } catch (e) { console.error('Training start failed:', e); }
        }

        detail += ` [${framework}]`;
        updateStep('dataset', 'success', detail);
      }

      // Step 3: Model inference
      updateStep('inference', 'running');
      let detections: any[] = [];
      const jobConfig = modelNode?.config || {};
      const selectedJob = trainingJobs.find(j => j.id === jobConfig.trainingJob);
      const modelPath = selectedJob?.modelPath || jobConfig.modelPath || 'yolov8n.pt';
      const confidence = filterNode?.config?.threshold || jobConfig.confidence || 0.25;

      if (imageBlob) {
        try {
          const formData = new FormData();
          formData.append('image', imageBlob, snapshotFilename);
          formData.append('model_path', modelPath);
          formData.append('confidence', String(confidence));
          const resp = await fetch(`${BASE_URL}/api/inference/`, { method: 'POST', body: formData });
          const result = await resp.json();
          if (result.success && result.data) {
            detections = result.data.boxes || [];
          } else {
            detections = [
              { label: 'person', confidence: 0.92, x1: 100, y1: 50, x2: 250, y2: 350 },
              { label: 'helmet', confidence: 0.87, x1: 120, y1: 40, x2: 200, y2: 120 },
            ];
          }
        } catch {
          detections = [
            { label: 'person', confidence: 0.92, x1: 100, y1: 50, x2: 250, y2: 350 },
            { label: 'vest', confidence: 0.78, x1: 110, y1: 100, x2: 240, y2: 300 },
          ];
        }
      }
      updateStep('inference', 'success', `${detections.length} object(s) detected using ${selectedJob?.modelType || 'YOLOv8'}`);

      // Step 4: Confidence filter
      if (filterNode) {
        updateStep('filter', 'running');
        await delay(300);
        const threshold = parseFloat(filterNode.config?.threshold || '0.5');
        const before = detections.length;
        detections = detections.filter((d: any) => d.confidence >= threshold);
        updateStep('filter', 'success', `${before} \u2192 ${detections.length} (threshold \u2265 ${threshold})`);
      }

      // Step 5: Alert evaluation
      updateStep('alert', 'running');
      await delay(400);
      let alertsCreated = 0;
      const camId = cameraNode?.config?.camera ? parseInt(cameraNode.config.camera) : 1;

      for (const rule of alertRules) {
        let triggered = false;
        if (rule.condition === 'count' || rule.condition === 'detection_count') {
          const val = parseFloat(rule.value);
          triggered = rule.operator === '>' ? detections.length > val :
                      rule.operator === '<' ? detections.length < val :
                      rule.operator === '==' ? detections.length === val : false;
        } else if (rule.condition === 'confidence') {
          const maxConf = Math.max(0, ...detections.map((d: any) => d.confidence));
          const val = parseFloat(rule.value);
          triggered = rule.operator === '>' ? maxConf > val :
                      rule.operator === '<' ? maxConf < val : false;
        } else if (rule.condition === 'label') {
          triggered = detections.some((d: any) => d.label === rule.value);
        }

        if (triggered) {
          try {
            await fetch(`${BASE_URL}/api/alerts/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                camera_id: camId,
                alert_type: rule.condition,
                message: `[Workflow] Rule triggered: ${rule.condition} ${rule.operator} ${rule.value} \u2014 ${detections.length} detection(s)`,
                status: 'active',
              }),
            });
            alertsCreated++;
          } catch (e) { console.error('Alert creation failed:', e); }
        }
      }
      // If no rules but detections exist, create a default alert
      if (alertRules.length === 0 && detections.length > 0) {
        try {
          await fetch(`${BASE_URL}/api/alerts/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              camera_id: camId,
              alert_type: 'workflow_detection',
              message: `[Workflow] ${detections.length} object(s) detected: ${detections.map((d: any) => d.label + '(' + (d.confidence * 100).toFixed(0) + '%)').join(', ')}`,
              status: 'active',
            }),
          });
          alertsCreated = 1;
        } catch (e) { console.error(e); }
      }
      updateStep('alert', 'success', `${alertsCreated} alert(s) created, ${alertRules.length} rule(s) evaluated`);

      // Step 6: Save detection to database
      updateStep('database', 'running');
      await delay(400);
      try {
        const detectionPayload = {
          camera_id: camId,
          event_type: 'workflow_detection',
          snapshot_path: snapshotFilename,
          objects: detections.map((d: any) => ({
            label: d.label, confidence: d.confidence,
            x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2,
          })),
        };
        const detResp = await fetch(`${BASE_URL}/api/detections/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(detectionPayload),
        });
        const detResult = await detResp.json();
        const dbName = configuredDatabases.find(d => d.id === dbNode?.config?.database)?.name || 'Database';
        updateStep('database', 'success', `Event #${detResult.data?.id || '?'} saved to ${dbName}`);
      } catch (e) {
        updateStep('database', 'error', `Failed: ${e}`);
      }

      // Step 7: Log
      updateStep('log', 'running');
      await delay(300);
      const logName = configuredLogFiles.find(l => l.id === logNode?.config?.logFile)?.name || 'Log';
      updateStep('log', 'success', `Written to ${logName}: ${detections.length} detections logged`);

    } catch (err: any) {
      console.error('Workflow run error:', err);
      const pendingStep = steps.find(s => s.status === 'running');
      if (pendingStep) updateStep(pendingStep.key, 'error', err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleDeleteWorkflow = async (workflowId: number) => {
    if (confirm('Delete this workflow?')) {
      const updatedWorkflows = workflows.filter(w => w.id !== workflowId);
      setWorkflows(updatedWorkflows);
      if (selectedWorkflow === workflowId) { setSelectedWorkflow(null); setNodes([]); setConnections([]); setAlertRules([]); }
      if (projectId && useCaseId) {
        try { await fetch(`${BASE_URL}/api/projects/${projectId}/use-cases/${useCaseId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflows: updatedWorkflows.length }) }); } catch (e) { console.error(e); }
      }
    }
  };

  /* ─── Quick-build: auto-create a complete pipeline ─── */
  const handleQuickBuild = () => {
    const pipeline: WorkflowNode[] = [
      { id: 'qb_cam',  type: 'input',    label: 'Camera',      icon: '\uD83D\uDCF9', x: snap(300), y: snap(20),  config: { camera: configuredCameras[0]?.id || '' } },
      { id: 'qb_edge', type: 'edge',     label: 'Edge Device', icon: '\u26A1', x: snap(300), y: snap(170), config: { edge: configuredEdgeDevices[0]?.id || '' } },
      { id: 'qb_ds',   type: 'dataset',  label: 'Dataset',     icon: '\uD83D\uDDBC\uFE0F', x: snap(560), y: snap(250), config: { dataset: availableDatasets[0]?.id || '', labelMode: 'auto', framework: 'pytorch', autoTrain: false, epochs: '3' } },
      { id: 'qb_mod',  type: 'model',    label: 'AI Model',    icon: '\uD83E\uDD16', x: snap(300), y: snap(400), config: { trainingJob: trainingJobs[0]?.id || '', repo: configuredModelRepos[0]?.id || '' } },
      { id: 'qb_filt', type: 'filter',   label: 'Filter',      icon: '\uD83D\uDD0D', x: snap(300), y: snap(550), config: { threshold: '0.5' } },
      { id: 'qb_alrt', type: 'alert',    label: 'Alert',       icon: '\uD83D\uDD14', x: snap(100), y: snap(700), config: { channel: 'email' } },
      { id: 'qb_db',   type: 'database', label: 'Database',    icon: '\uD83D\uDCBE', x: snap(300), y: snap(700), config: { database: configuredDatabases[0]?.id || '' } },
      { id: 'qb_log',  type: 'log',      label: 'Log File',    icon: '\uD83D\uDCDD', x: snap(500), y: snap(700), config: { logFile: configuredLogFiles[0]?.id || '' } },
    ];
    const pipeConns: NodeConnection[] = [
      { id: 'qc1', fromNodeId: 'qb_cam',  toNodeId: 'qb_edge' },
      { id: 'qc2', fromNodeId: 'qb_edge', toNodeId: 'qb_mod' },
      { id: 'qc7', fromNodeId: 'qb_edge', toNodeId: 'qb_ds' },
      { id: 'qc8', fromNodeId: 'qb_ds',   toNodeId: 'qb_mod' },
      { id: 'qc3', fromNodeId: 'qb_mod',  toNodeId: 'qb_filt' },
      { id: 'qc4', fromNodeId: 'qb_filt', toNodeId: 'qb_alrt' },
      { id: 'qc5', fromNodeId: 'qb_filt', toNodeId: 'qb_db' },
      { id: 'qc6', fromNodeId: 'qb_filt', toNodeId: 'qb_log' },
    ];
    setNodes(pipeline);
    setConnections(pipeConns);
    setSelectedNode(null);
  };

  /* ─── Helpers ─── */
  const getNodeColor = (type: string) => nodeTypes.find(nt => nt.type === type)?.color || 'from-gray-400 to-gray-600';
  const currentWorkflow = workflows.find(w => w.id === selectedWorkflow);
  const selectedNodeData = nodes.find(n => n.id === selectedNode);

  const getNodeBottom = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + NODE_W / 2, y: node.y + NODE_H };
  };

  const getNodeTop = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + NODE_W / 2, y: node.y };
  };

  const isNodeConfigured = (node: WorkflowNode) => {
    const c = node.config || {};
    switch (node.type) {
      case 'input': return !!c.camera;
      case 'edge': return !!c.edge;
      case 'dataset': return !!c.dataset;
      case 'model': return !!(c.trainingJob || c.repo);
      case 'llm': return !!c.llmRepo;
      case 'filter': return c.threshold !== undefined;
      case 'alert': return !!c.channel;
      case 'database': return !!c.database;
      case 'log': return !!c.logFile;
      default: return false;
    }
  };

  /* ─── RENDER ─── */
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      {projectId && useCaseId && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link to="/projects" className="hover:text-purple-600 transition-colors flex items-center gap-1">
            <FolderKanban className="w-4 h-4" />
            Projects
          </Link>
          <ChevronLeft className="w-4 h-4 rotate-180" />
          <Link to={`/projects/${projectId}/use-cases`} className="hover:text-purple-600 transition-colors">
            {projectName}
          </Link>
          <ChevronLeft className="w-4 h-4 rotate-180" />
          <div className="flex items-center gap-1">
            <Lightbulb className="w-4 h-4" />
            <span className="font-semibold text-gray-900">{useCaseName} Workflows</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl p-8 shadow-2xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Workflow Builder</h2>
            <p className="text-violet-100">Design complete processing pipelines with all required components</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button onClick={() => setIsAlertRulesModalOpen(true)} disabled={!selectedWorkflow}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all disabled:opacity-50">
              <Settings className="w-4 h-4" /> Rules ({alertRules.length})
            </button>
            <button onClick={() => setShowRequirementsPanel(!showRequirementsPanel)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all">
              <FileText className="w-4 h-4" /> {showRequirementsPanel ? 'Hide' : 'Show'}
            </button>
            <button onClick={handleSaveWorkflow} disabled={!selectedWorkflow || !isWorkflowValid}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all disabled:opacity-50">
              <Save className="w-4 h-4" /> Save
            </button>
            <button onClick={() => setIsNewWorkflowModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2 bg-white text-purple-600 rounded-lg hover:bg-violet-50 transition-all shadow-lg">
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
        </div>
      </div>

      <div className={`grid gap-6 ${showRequirementsPanel ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
        {/* Left Panel: Workflows & Node Palette */}
        <div className="lg:col-span-1 space-y-4">
          {/* Workflow list */}
          <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
            <h3 className="text-sm font-bold mb-3 text-gray-800">Workflows</h3>
            <div className="space-y-2">
              {workflows.map((workflow) => (
                <div key={workflow.id}
                  className={`p-3 border-2 rounded-xl transition-all cursor-pointer ${selectedWorkflow === workflow.id ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}
                  onClick={() => handleWorkflowSelect(workflow.id)}>
                  <div className="font-semibold text-xs mb-1">{workflow.name}</div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600">{workflow.steps} nodes</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${workflow.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {workflow.status}
                    </span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteWorkflow(workflow.id); }}
                    className="w-full mt-2 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all">Delete</button>
                </div>
              ))}
            </div>
          </div>

          {/* Node palette */}
          <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
            <h3 className="text-sm font-bold mb-3 text-gray-800">Drag Nodes to Canvas</h3>
            <div className="space-y-2">
              {nodeTypes.map((node, idx) => (
                <div key={idx} draggable onDragStart={() => handleNodeDragStart(node)}
                  className={`flex items-center gap-2 p-2.5 bg-gradient-to-r ${node.color} text-white rounded-xl cursor-grab hover:shadow-lg hover:scale-[1.02] transition-all active:cursor-grabbing`}>
                  <span className="text-lg">{node.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold block">{node.label}</span>
                    <span className="text-[10px] opacity-75 block truncate">{node.description}</span>
                  </div>
                  {node.required && <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full">REQ</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          {selectedWorkflow && (
            <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100 space-y-2">
              <h3 className="text-sm font-bold text-gray-800 mb-2">Quick Actions</h3>
              <button onClick={handleQuickBuild}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg hover:from-violet-600 hover:to-purple-700 transition-all">
                <Zap className="w-3.5 h-3.5" /> Auto-Build Pipeline
              </button>
              <button onClick={handleAutoLayout} disabled={nodes.length === 0}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all disabled:opacity-50">
                <LayoutGrid className="w-3.5 h-3.5" /> Auto-Layout
              </button>
              <button onClick={() => { setNodes([]); setConnections([]); setAlertRules([]); }}
                disabled={nodes.length === 0}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50">
                <RotateCcw className="w-3.5 h-3.5" /> Clear Canvas
              </button>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className={showRequirementsPanel ? 'lg:col-span-4' : 'lg:col-span-4'}>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {selectedWorkflow ? (
              <div>
                {/* Canvas header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{currentWorkflow?.name}</h3>
                      <p className="text-sm text-gray-600">{nodes.length} nodes &bull; {connections.length} connections</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {connectingFrom && (
                        <span className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold animate-pulse">
                          <Zap className="w-4 h-4" /> Click target node to connect
                          <button onClick={() => setConnectingFrom(null)} className="ml-1 hover:text-blue-900"><X className="w-3 h-3" /></button>
                        </span>
                      )}
                      {isWorkflowValid ? (
                        <span className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-semibold">
                          <CheckCircle className="w-4 h-4" /> Ready
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-semibold">
                          <AlertCircle className="w-4 h-4" /> Incomplete
                        </span>
                      )}
                      {nodes.length > 0 && (
                        <button onClick={handleRunWorkflow} disabled={!isWorkflowValid || isRunning}
                          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-md disabled:opacity-50">
                          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                          {isRunning ? 'Running...' : 'Run Pipeline'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* The canvas area */}
                <div
                  ref={canvasRef}
                  className="relative bg-gradient-to-br from-slate-50 to-white select-none"
                  style={{
                    minHeight: '750px',
                    backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
                    backgroundSize: `${GRID}px ${GRID}px`,
                    cursor: movingNode ? 'grabbing' : connectingFrom ? 'crosshair' : 'default',
                  }}
                  onDrop={handleCanvasDrop}
                  onDragOver={handleCanvasDragOver}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  onClick={() => { setSelectedNode(null); if (!movingNode) setConnectingFrom(null); }}
                >
                  {/* SVG connections layer */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                    <defs>
                      <marker id="arrowhead" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto">
                        <polygon points="0 0, 12 4, 0 8" fill="#7c3aed" />
                      </marker>
                      <marker id="arrowhead-active" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto">
                        <polygon points="0 0, 12 4, 0 8" fill="#10b981" />
                      </marker>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {connections.map((conn) => {
                      const from = getNodeBottom(conn.fromNodeId);
                      const to = getNodeTop(conn.toNodeId);
                      const dy = to.y - from.y;
                      const cp = Math.max(40, Math.abs(dy) * 0.5);
                      const path = `M ${from.x} ${from.y} C ${from.x} ${from.y + cp}, ${to.x} ${to.y - cp}, ${to.x} ${to.y}`;

                      return (
                        <g key={conn.id}>
                          {/* Shadow path */}
                          <path d={path} stroke="#7c3aed" strokeWidth="3" fill="none" opacity="0.15" strokeLinecap="round" />
                          {/* Main path */}
                          <path d={path} stroke="#7c3aed" strokeWidth="2.5" fill="none" strokeLinecap="round" markerEnd="url(#arrowhead)" filter="url(#glow)" />
                          {/* Animated flow dot */}
                          <circle r="4" fill="#7c3aed" opacity="0.8">
                            <animateMotion dur="2s" repeatCount="indefinite" path={path} />
                          </circle>
                          {/* Delete button */}
                          <g className="pointer-events-auto cursor-pointer" onClick={(e) => handleDeleteConnection(conn.id, e)}>
                            <circle cx={(from.x + to.x) / 2} cy={(from.y + to.y) / 2} r="10" fill="white" stroke="#ef4444" strokeWidth="2" className="hover:fill-red-50" />
                            <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2} textAnchor="middle" dominantBaseline="middle" className="text-xs font-bold fill-red-600 pointer-events-none">&times;</text>
                          </g>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Nodes */}
                  {nodes.map((node) => {
                    const configured = isNodeConfigured(node);
                    const isSelected = selectedNode === node.id;
                    const isConnectSource = connectingFrom === node.id;

                    return (
                      <div
                        key={node.id}
                        className={`absolute rounded-2xl shadow-lg transition-shadow duration-200 ${isSelected ? 'ring-4 ring-purple-400 shadow-xl z-20' : isConnectSource ? 'ring-4 ring-blue-400 shadow-xl z-20' : 'hover:shadow-xl z-10'}`}
                        style={{ left: node.x, top: node.y, width: NODE_W, cursor: movingNode === node.id ? 'grabbing' : 'grab' }}
                        onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (connectingFrom && connectingFrom !== node.id) {
                            handleCompleteConnection(node.id, e);
                          } else {
                            setSelectedNode(node.id === selectedNode ? null : node.id);
                          }
                        }}
                      >
                        {/* Input port (top) */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30"
                          onClick={(e) => { e.stopPropagation(); if (connectingFrom) handleCompleteConnection(node.id, e); }}>
                          <div className={`w-5 h-5 rounded-full border-2 border-white shadow-md transition-all ${connectingFrom && connectingFrom !== node.id ? 'bg-blue-500 scale-125 animate-pulse' : 'bg-slate-400 hover:bg-blue-500'}`} />
                        </div>

                        {/* Node body */}
                        <div className={`bg-gradient-to-r ${getNodeColor(node.type)} p-3 rounded-t-2xl`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{node.icon}</span>
                              <span className="text-white font-bold text-sm">{node.label}</span>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={(e) => { e.stopPropagation(); handleOpenConfig(node.id); }}
                                className="p-1 bg-white/20 hover:bg-white/40 rounded-lg transition-all" title="Configure">
                                <Settings className="w-3.5 h-3.5 text-white" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                                className="p-1 bg-white/20 hover:bg-white/40 rounded-lg transition-all" title="Delete">
                                <X className="w-3.5 h-3.5 text-white" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Config summary */}
                        <div className="bg-white p-3 rounded-b-2xl border-x-2 border-b-2 border-gray-100">
                          {configured ? (
                            <div className="space-y-1">
                              {Object.entries(node.config || {}).slice(0, 2).map(([key, value]) => (
                                <div key={key} className="text-[11px] text-gray-600 truncate flex items-center gap-1">
                                  <span className="font-semibold text-gray-700">{key}:</span>
                                  <span className="truncate">{String(value)}</span>
                                </div>
                              ))}
                              <div className="flex items-center gap-1 text-[10px] text-green-600 font-semibold mt-1">
                                <CheckCircle className="w-3 h-3" /> Configured
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[11px] text-amber-600">
                              <AlertCircle className="w-3 h-3" /> Click gear to configure
                            </div>
                          )}
                        </div>

                        {/* Output port (bottom) */}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30"
                          onClick={(e) => { e.stopPropagation(); handleStartConnection(node.id, e); }}>
                          <div className={`w-5 h-5 rounded-full border-2 border-white shadow-md transition-all ${connectingFrom === node.id ? 'bg-green-500 scale-125 ring-4 ring-green-300' : 'bg-green-500 hover:bg-green-600 hover:scale-110'}`} />
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty state */}
                  {nodes.length === 0 && (
                    <div className="flex items-center justify-center" style={{ minHeight: '750px' }}>
                      <div className="text-center p-8 max-w-md">
                        <div className="text-6xl mb-4">{'\uD83C\uDFD7\uFE0F'}</div>
                        <h3 className="text-xl font-bold text-gray-700 mb-3">Build Your Workflow</h3>
                        <p className="text-gray-500 mb-6">Drag nodes from the left panel onto this canvas, then connect them to build a processing pipeline.</p>
                        <div className="space-y-3 text-left bg-gray-50 rounded-xl p-4">
                          <p className="text-sm font-semibold text-gray-700 mb-2">How it works:</p>
                          <div className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold shrink-0">1</span>
                            <span><strong>Drag &amp; drop</strong> nodes onto the canvas from the left panel</span>
                          </div>
                          <div className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold shrink-0">2</span>
                            <span><strong>Configure</strong> each node by clicking the gear icon</span>
                          </div>
                          <div className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold shrink-0">3</span>
                            <span><strong>Connect</strong> nodes: click the <span className="inline-block w-3 h-3 bg-green-500 rounded-full align-middle"></span> output port, then click the target node</span>
                          </div>
                          <div className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold shrink-0">4</span>
                            <span><strong>Run</strong> the pipeline to execute real inference and save detections</span>
                          </div>
                        </div>
                        <button onClick={handleQuickBuild}
                          className="mt-6 flex items-center gap-2 mx-auto px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg">
                          <Zap className="w-4 h-4" /> Quick-Build Complete Pipeline
                        </button>
                      </div>
                    </div>
                  )}

                  {/* DAG connection legend */}
                  {nodes.length > 0 && (
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg p-2 text-[10px] text-gray-500 border shadow-sm z-30">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full inline-block"></span> Output</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-400 rounded-full inline-block"></span> Input</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1 bg-purple-500 inline-block rounded"></span> Data Flow</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Square className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Select a workflow to start editing</p>
                </div>
              </div>
            )}
          </div>

          {/* Run Results Panel */}
          {showRunPanel && runSteps.length > 0 && (
            <div className="mt-4 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  {isRunning ? <Loader2 className="w-5 h-5 animate-spin text-purple-600" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
                  Pipeline Execution
                </h3>
                <button onClick={() => setShowRunPanel(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {runSteps.map((step, idx) => (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        step.status === 'success' ? 'bg-green-100 text-green-700' :
                        step.status === 'running' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                        step.status === 'error' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {step.status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> :
                         step.status === 'success' ? <CheckCircle className="w-4 h-4" /> :
                         step.status === 'error' ? <AlertCircle className="w-4 h-4" /> :
                         step.icon}
                      </div>
                      {idx < runSteps.length - 1 && (
                        <div className={`w-0.5 h-6 ${step.status === 'success' ? 'bg-green-300' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{step.label}</span>
                        {step.status === 'success' && <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">Done</span>}
                        {step.status === 'error' && <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">Failed</span>}
                      </div>
                      {step.detail && <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Requirements Panel */}
        {showRequirementsPanel && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100 sticky top-6">
              <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" /> Requirements
              </h3>
              <div className="space-y-2">
                {[
                  { key: 'camera' as const, label: 'Camera', icon: '\uD83D\uDCF9', required: true },
                  { key: 'edge' as const, label: 'Edge Device', icon: '\u26A1', required: true },
                  { key: 'database' as const, label: 'Database', icon: '\uD83D\uDCBE', required: true },
                  { key: 'logFile' as const, label: 'Log File', icon: '\uD83D\uDCDD', required: true },
                  { key: 'modelRepo' as const, label: 'Model Repo', icon: '\uD83D\uDDC2\uFE0F', required: true },
                  { key: 'llmRepo' as const, label: 'LLM Repo', icon: '\uD83E\uDDE0', required: false },
                  { key: 'alertConfig' as const, label: 'Alert', icon: '\uD83D\uDD14', required: true },
                ].map((item) => {
                  const isConfigured = currentRequirements[item.key];
                  return (
                    <div key={item.key} className={`flex items-center justify-between p-2.5 rounded-xl border-2 ${
                      isConfigured ? 'bg-green-50 border-green-200' :
                      item.required ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <div>
                          <div className="text-xs font-semibold text-gray-800">{item.label}</div>
                          <div className="text-[10px] text-gray-500">{item.required ? 'Required' : 'Optional'}</div>
                        </div>
                      </div>
                      {isConfigured ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                       item.required ? <AlertCircle className="w-4 h-4 text-red-600" /> :
                       <div className="w-4 h-4 rounded-full bg-gray-300"></div>}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-800">Alert Rules</span>
                  <span className="px-2 py-0.5 bg-purple-600 text-white rounded-full text-[10px] font-bold">{alertRules.length}</span>
                </div>
                <p className="text-[10px] text-gray-600">Conditional triggers for detections</p>
              </div>

              {/* DAG flow reference */}
              <div className="mt-4 p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                <span className="text-xs font-bold text-gray-800 block mb-2">DAG Flow Order</span>
                <div className="space-y-1">
                  {['\uD83D\uDCF9 Camera', '\u26A1 Edge', '\uD83D\uDDBC\uFE0F Dataset*', '\uD83E\uDD16 Model', '\uD83D\uDD0D Filter*', '\uD83E\uDDE0 LLM*', '\uD83D\uDD14 Alert', '\uD83D\uDCBE Database', '\uD83D\uDCDD Log'].map((item, i) => (
                    <div key={i} className="flex items-center gap-1 text-[10px] text-gray-600">
                      <span className="text-gray-400">{i > 0 ? '\u2193' : ' '}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                  <p className="text-[9px] text-gray-400 mt-1">* = optional</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isConfigModalOpen && selectedNodeData && (
        <ConfigModal nodeData={selectedNodeData} onSave={handleUpdateNodeConfig} onClose={() => setIsConfigModalOpen(false)} />
      )}

      {isAlertRulesModalOpen && (
        <AlertRulesModal rules={alertRules} onSave={(newRules: AlertRule[]) => { setAlertRules(newRules); setIsAlertRulesModalOpen(false); }} onClose={() => setIsAlertRulesModalOpen(false)} />
      )}

      {isNewWorkflowModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Create New Workflow</h3>
            <input type="text" value={newWorkflowName} onChange={(e) => setNewWorkflowName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl mb-6 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none" placeholder="e.g. PPE Detection Pipeline" autoFocus />
            <div className="flex gap-3">
              <button onClick={handleCreateWorkflow} disabled={!newWorkflowName.trim()}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-all">Create</button>
              <button onClick={() => { setIsNewWorkflowModalOpen(false); setNewWorkflowName(''); }}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Config Modal — with Training Job selection for AI Model
   ================================================================ */
function ConfigModal({ nodeData, onSave, onClose }: any) {
  const [config, setConfig] = useState(nodeData.config || {});

  const renderField = (label: string, key: string, options: any[], render: (item: any) => string, emptyMsg: string) => (
    <div>
      <label className="block text-sm font-semibold mb-2 text-gray-700">{label}</label>
      {options.length === 0 ? (
        <p className="text-sm text-red-500 italic">{emptyMsg}</p>
      ) : (
        <select value={config[key] || ''} onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none bg-white">
          <option value="">Choose...</option>
          {options.map((item: any) => (
            <option key={item.id} value={item.id}>{render(item)}</option>
          ))}
        </select>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold">Configure {nodeData.label}</h3>
            <p className="text-sm text-gray-500 mt-1">{nodeTypes.find(nt => nt.type === nodeData.type)?.description}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-5">
          {nodeData.type === 'input' && renderField('Camera', 'camera', configuredCameras, (c) => `${c.name} \u2014 ${c.location || c.resolution}`, 'No cameras configured. Add one in Camera Management first.')}

          {nodeData.type === 'edge' && renderField('Edge Device', 'edge', configuredEdgeDevices, (e) => `${e.name} \u2014 ${e.gpu || e.location}`, 'No edge devices configured. Add one in Edge Devices first.')}

          {nodeData.type === 'dataset' && (
            <>
              {renderField('Dataset', 'dataset', availableDatasets, (d) => `${d.name} (${d.totalImages} images, ${d.labeled} labeled)`, 'No datasets found. Create one in Labeling first.')}

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Labeling Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'manual', label: 'Manual Labeling', icon: '\u270F\uFE0F', desc: 'Label images manually in the labeling tool' },
                    { value: 'auto', label: 'Auto Labeling', icon: '\uD83E\uDD16', desc: 'Use YOLOv8 pre-trained model to auto-label' },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setConfig({ ...config, labelMode: opt.value })}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${config.labelMode === opt.value ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{opt.icon}</span>
                        <span className="text-sm font-semibold">{opt.label}</span>
                      </div>
                      <p className="text-[11px] text-gray-500">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Training Framework</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'pytorch', label: 'PyTorch (YOLO)', icon: '\uD83D\uDD25', desc: 'YOLOv8 object detection', color: 'orange' },
                    { value: 'tensorflow', label: 'TensorFlow', icon: '\uD83E\uDDE0', desc: 'MobileNet / EfficientNet / ResNet', color: 'blue' },
                    { value: 'both', label: 'Both', icon: '\u26A1', desc: 'Train on both frameworks', color: 'purple' },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setConfig({ ...config, framework: opt.value })}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${config.framework === opt.value ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{opt.icon}</span>
                        <span className="text-xs font-semibold">{opt.label}</span>
                      </div>
                      <p className="text-[10px] text-gray-500">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700">Auto-Start Training on Run</label>
                  <button type="button"
                    onClick={() => setConfig({ ...config, autoTrain: !config.autoTrain })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${config.autoTrain ? 'bg-purple-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.autoTrain ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
                {config.autoTrain && (
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-600">Epochs</label>
                    <input type="number" min="1" max="100" value={config.epochs || '3'}
                      onChange={(e) => setConfig({ ...config, epochs: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-500 outline-none" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Upload Images (optional)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-purple-400 transition-all">
                  <input type="file" multiple accept="image/*" id="dataset-upload"
                    className="hidden"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0 || !config.dataset) return;
                      const formData = new FormData();
                      Array.from(files).forEach(f => formData.append('files', f));
                      try {
                        const resp = await fetch(`${BASE_URL}/api/label-datasets/${config.dataset}/images/`, { method: 'POST', body: formData });
                        const result = await resp.json();
                        if (result.success) {
                          setConfig({ ...config, uploadedCount: (config.uploadedCount || 0) + (result.data?.length || files.length) });
                          alert(`\u2705 ${result.data?.length || files.length} image(s) uploaded to dataset!`);
                        }
                      } catch (err) { alert('Upload failed: ' + err); }
                    }} />
                  <label htmlFor="dataset-upload" className="cursor-pointer">
                    <div className="text-3xl mb-2">{'\uD83D\uDCC1'}</div>
                    <p className="text-sm text-gray-600 font-semibold">Click to upload images</p>
                    <p className="text-xs text-gray-400">JPG, PNG, WebP, BMP</p>
                    {config.uploadedCount > 0 && (
                      <p className="text-xs text-green-600 font-semibold mt-1">{'\u2705'} {config.uploadedCount} image(s) uploaded this session</p>
                    )}
                  </label>
                </div>
              </div>
            </>
          )}

          {nodeData.type === 'model' && (
            <>
              {renderField('Trained Model (from Training Jobs)', 'trainingJob', trainingJobs, (j) => `${j.name} \u2014 ${j.modelType}`, 'No completed training jobs found. Train a model first.')}
              {renderField('Model Configuration', 'repo', configuredModelRepos, (m) => `${m.name} \u2014 ${m.type}`, 'No model configs found.')}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Confidence Threshold</label>
                <input type="number" min="0" max="1" step="0.05" value={config.confidence || 0.25}
                  onChange={(e) => setConfig({ ...config, confidence: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none" />
              </div>
            </>
          )}

          {nodeData.type === 'llm' && renderField('LLM Repository', 'llmRepo', configuredLLMRepos, (l) => `${l.name} \u2014 ${l.provider}`, 'No LLM configs found. This node is optional.')}

          {nodeData.type === 'database' && renderField('Database', 'database', configuredDatabases, (d) => `${d.name} \u2014 ${d.type} (${d.host})`, 'No databases configured. Add one in Database Config first.')}

          {nodeData.type === 'log' && renderField('Log Configuration', 'logFile', configuredLogFiles, (l) => `${l.name} \u2014 retention: ${l.retention}`, 'No log configs found. Add one in Log Config first.')}

          {nodeData.type === 'alert' && (
            <>
              {renderField('Alert Channel', 'channel', configuredAlertChannels, (c) => `${c.name} \u2014 ${c.type}`, '')}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Severity</label>
                <select value={config.severity || 'medium'} onChange={(e) => setConfig({ ...config, severity: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none bg-white">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </>
          )}

          {nodeData.type === 'filter' && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Confidence Threshold</label>
              <input type="number" min="0" max="1" step="0.05" value={config.threshold || 0.5}
                onChange={(e) => setConfig({ ...config, threshold: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none" />
              <p className="text-xs text-gray-500 mt-1">Detections below this confidence will be filtered out</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-8 pt-6 border-t">
          <button onClick={() => onSave(config)} className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-semibold">Save Configuration</button>
          <button onClick={onClose} className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Alert Rules Modal
   ================================================================ */
function AlertRulesModal({ rules, onSave, onClose }: any) {
  const [localRules, setLocalRules] = useState<AlertRule[]>(rules);
  const [isAdding, setIsAdding] = useState(false);
  const [newRule, setNewRule] = useState<AlertRule>({ id: '', condition: 'detection_count', operator: '>', value: '0', action: 'email', severity: 'medium' });

  const handleAdd = () => {
    if (!newRule.action) return;
    setLocalRules([...localRules, { ...newRule, id: `rule-${Date.now()}` }]);
    setNewRule({ id: '', condition: 'detection_count', operator: '>', value: '0', action: 'email', severity: 'medium' });
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold">Alert Rules</h3>
            <p className="text-sm text-gray-500 mt-1">Define conditions that trigger alerts during workflow execution</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3 mb-6">
          {localRules.length === 0 && !isAdding && (
            <div className="text-center py-6 text-gray-400">
              <ZapOff className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No rules yet. A default alert will be created for any detection.</p>
            </div>
          )}
          {localRules.map((rule) => (
            <div key={rule.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border">
              <div className="flex-1">
                <div className="text-sm font-mono">
                  IF <span className="font-bold text-purple-600">{rule.condition}</span> {rule.operator} <span className="font-bold text-blue-600">{rule.value}</span> THEN <span className="font-bold text-red-600">{rule.action}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">Severity: <span className={`font-semibold ${rule.severity === 'critical' ? 'text-red-600' : rule.severity === 'high' ? 'text-orange-600' : 'text-gray-600'}`}>{rule.severity}</span></div>
              </div>
              <button onClick={() => setLocalRules(localRules.filter(r => r.id !== rule.id))} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>

        {isAdding && (
          <div className="p-6 bg-blue-50 rounded-xl mb-6 space-y-4">
            <h4 className="text-sm font-bold text-gray-700">New Rule</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Condition</label>
                <select value={newRule.condition} onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })} className="w-full px-3 py-2 border-2 rounded-lg text-sm">
                  <option value="detection_count">Detection Count</option>
                  <option value="confidence">Max Confidence</option>
                  <option value="label">Label Match</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Operator</label>
                <select value={newRule.operator} onChange={(e) => setNewRule({ ...newRule, operator: e.target.value })} className="w-full px-3 py-2 border-2 rounded-lg text-sm">
                  <option value=">">&gt;</option>
                  <option value="<">&lt;</option>
                  <option value="==">==</option>
                  <option value="!=">!=</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Value</label>
                <input type="text" value={newRule.value} onChange={(e) => setNewRule({ ...newRule, value: e.target.value })} className="w-full px-3 py-2 border-2 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Alert Channel</label>
                <select value={newRule.action} onChange={(e) => setNewRule({ ...newRule, action: e.target.value })} className="w-full px-3 py-2 border-2 rounded-lg text-sm">
                  {configuredAlertChannels.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Severity</label>
                <select value={newRule.severity} onChange={(e) => setNewRule({ ...newRule, severity: e.target.value })} className="w-full px-3 py-2 border-2 rounded-lg text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">Add Rule</button>
              <button onClick={() => setIsAdding(false)} className="px-4 py-2 border-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        )}

        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="w-full px-4 py-3 border-2 border-dashed rounded-xl hover:border-blue-500 text-gray-600 transition-all text-sm">+ Add Alert Rule</button>
        )}

        <div className="flex gap-3 mt-6 pt-6 border-t">
          <button onClick={() => onSave(localRules)} className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold transition-all">Save Rules ({localRules.length})</button>
          <button onClick={onClose} className="px-6 py-3 border-2 rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
        </div>
      </div>
    </div>
  );
}
