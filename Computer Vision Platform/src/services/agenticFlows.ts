import axios from 'axios';

export interface AgenticFlowStep {
  id: number;
  name: string;
  type: string;
  config: Record<string, any>;
  depends_on: number[];
  status: string;
  result: Record<string, any>;
}

export interface AgenticFlow {
  id: number;
  name: string;
  created_by: string;
  steps: AgenticFlowStep[];
  status: string;
  created_at: string;
  updated_at: string;
}

export async function fetchAgenticFlows(): Promise<AgenticFlow[]> {
  const res = await axios.get('/api/agentic-flows');
  return res.data;
}

export async function createAgenticFlow(flow: Partial<AgenticFlow>): Promise<AgenticFlow> {
  const res = await axios.post('/api/agentic-flows', flow);
  return res.data;
}

export async function executeAgenticFlow(flowId: number): Promise<AgenticFlow> {
  const res = await axios.post(`/api/agentic-flows/${flowId}/execute`);
  return res.data;
}

export async function approveAgenticStep(flowId: number, stepId: number): Promise<AgenticFlow> {
  const res = await axios.post(`/api/agentic-flows/${flowId}/step/${stepId}/approve`);
  return res.data;
}
