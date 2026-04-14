import { api } from "./api";

export interface ModelDeployment {
  id: number;
  model: string;
  stations: string[];
  status: "running" | "stopped";
  fps: number;
  latency: string;
  uptime: string;
  detections: string;
}

export interface DeploymentPayload {
  model: string;
  stations?: string[];
  status?: "running" | "stopped";
  fps?: number;
  latency?: string;
  uptime?: string;
  detections?: string;
}

export const modelDeploymentsService = {
  list:      ()                                              => api.get<ModelDeployment[]>("/api/model-deployments/"),
  get:       (id: number)                                    => api.get<ModelDeployment>(`/api/model-deployments/${id}`),
  create:    (data: DeploymentPayload)                       => api.post<ModelDeployment>("/api/model-deployments/", data),
  update:    (id: number, data: Partial<DeploymentPayload>)  =>
                                                                api.put<ModelDeployment>(`/api/model-deployments/${id}`, data),
  remove:    (id: number)                                    => api.delete(`/api/model-deployments/${id}`),
  setStatus: (id: number, status: "running" | "stopped")    =>
                                                                api.put<ModelDeployment>(`/api/model-deployments/${id}/status`, { status }),
};
