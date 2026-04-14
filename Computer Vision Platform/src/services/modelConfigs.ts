import { api } from "./api";

export interface ModelConfig {
  id: number;
  name: string;
  version: string;
  size: string;
  type: string;
  accuracy: string;
  framework: string;
  description: string;
  status: "active" | "deprecated" | "testing";
  updated: string;
  created_at: string;
}

export interface ModelConfigPayload {
  name: string;
  version?: string;
  size?: string;
  model_type?: string;
  accuracy?: string;
  framework?: string;
  description?: string;
  status?: ModelConfig["status"];
}

export const modelConfigsService = {
  list:   ()                                              => api.get<ModelConfig[]>("/api/config/models/"),
  get:    (id: number)                                    => api.get<ModelConfig>(`/api/config/models/${id}`),
  create: (data: ModelConfigPayload)                      => api.post<ModelConfig>("/api/config/models/", data),
  update: (id: number, data: Partial<ModelConfigPayload>) => api.put<ModelConfig>(`/api/config/models/${id}`, data),
  remove: (id: number)                                    => api.delete(`/api/config/models/${id}`),
};
