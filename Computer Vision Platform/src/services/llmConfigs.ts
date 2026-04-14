import { api } from "./api";

export interface LlmConfig {
  id: number;
  name: string;
  provider: string;
  size: string;
  type: string;
  context: string;
  endpoint: string;
  description: string;
  status: "deployed" | "configured" | "available";
  created_at: string;
}

export interface LlmConfigPayload {
  name: string;
  provider?: string;
  size?: string;
  llm_type?: string;
  context_len?: string;
  endpoint?: string;
  description?: string;
  status?: LlmConfig["status"];
}

export const llmConfigsService = {
  list:   ()                                               => api.get<LlmConfig[]>("/api/config/llms/"),
  get:    (id: number)                                     => api.get<LlmConfig>(`/api/config/llms/${id}`),
  create: (data: LlmConfigPayload)                         => api.post<LlmConfig>("/api/config/llms/", data),
  update: (id: number, data: Partial<LlmConfigPayload>)    => api.put<LlmConfig>(`/api/config/llms/${id}`, data),
  remove: (id: number)                                     => api.delete(`/api/config/llms/${id}`),
};
