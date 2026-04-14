import { api } from "./api";

export interface LogConfig {
  id: number;
  category: string;
  retention: string;
  maxSize: string;
  rotation: string;
  level: "info" | "debug" | "warning" | "error";
  created_at: string;
}

export interface LogConfigPayload {
  category: string;
  retention?: string;
  max_size?: string;
  rotation?: string;
  log_level?: LogConfig["level"];
}

export const logConfigsService = {
  list:   ()                                               => api.get<LogConfig[]>("/api/config/logs/"),
  get:    (id: number)                                     => api.get<LogConfig>(`/api/config/logs/${id}`),
  create: (data: LogConfigPayload)                         => api.post<LogConfig>("/api/config/logs/", data),
  update: (id: number, data: Partial<LogConfigPayload>)    => api.put<LogConfig>(`/api/config/logs/${id}`, data),
  remove: (id: number)                                     => api.delete(`/api/config/logs/${id}`),
};
